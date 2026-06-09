const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const emailService = require('../services/emailService');

// ── helpers ──────────────────────────────────────────────────────────────────
function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

const safeUser = (u) => ({
  id: u.id, email: u.email, name: u.name,
  avatarUrl: u.avatarUrl, role: u.role, isVerified: u.isVerified,
});

// ── POST /auth/register ───────────────────────────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(72),
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // Create empty learner profile
    await prisma.learnerProfile.create({ data: { userId: user.id } });

    // Emit activity event
    await prisma.activityEvent.create({
      data: { userId: user.id, eventType: 'user_registered' },
    });

    // Send verification email (non-blocking)
    const verifyToken = jwt.sign(
      { userId: user.id, purpose: 'email_verify' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    emailService.sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken })
      .catch(() => {});

    // Do NOT issue tokens — user must verify email before logging in
    res.status(201).json({ message: 'Account created. Please check your email to verify your account before logging in.' });
  } catch (err) { next(err); }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox for the verification link.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.activityEvent.create({
      data: { userId: user.id, eventType: 'user_login' },
    });

    const accessToken  = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ user: safeUser(user), accessToken, refreshToken });
  } catch (err) { next(err); }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = signAccessToken(payload.userId);

    res.json({ accessToken });
  } catch (err) { next(err); }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    res.json({ user: safeUser(user), profile: user.profile });
  } catch (err) { next(err); }
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken })
        .catch(() => {});
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
});

// ── GET /auth/verify-email?token=... ─────────────────────────────────────────
// Link in email hits this directly — backend verifies and redirects to frontend.
router.get('/verify-email', async (req, res, next) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  try {
    const { token } = req.query;
    if (!token) return res.redirect(`${frontendUrl}/login?verified=error&msg=missing_token`);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.redirect(`${frontendUrl}/login?verified=error&msg=invalid_or_expired`);
    }
    if (payload.purpose !== 'email_verify') {
      return res.redirect(`${frontendUrl}/login?verified=error&msg=wrong_purpose`);
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { isVerified: true },
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});

    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (err) { next(err); }
});

// ── POST /auth/verify-email (kept for API compatibility) ──────────────────────
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    if (payload.purpose !== 'email_verify') {
      return res.status(400).json({ error: 'Invalid token purpose' });
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { isVerified: true },
    });

    emailService.sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});
    res.json({ message: 'Email verified successfully', user: safeUser(user) });
  } catch (err) { next(err); }
});

// ── POST /auth/resend-verification ────────────────────────────────────────────
router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user?.isVerified) return res.json({ message: 'Already verified' });

    const verifyToken = jwt.sign(
      { userId: user.id, purpose: 'email_verify' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    await emailService.sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken });
    res.json({ message: 'Verification email sent' });
  } catch (err) { next(err); }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = z.object({
      token:    z.string(),
      password: z.string().min(8).max(72),
    }).parse(req.body);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    if (payload.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token purpose' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: payload.userId }, data: { passwordHash } });
    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });

    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
