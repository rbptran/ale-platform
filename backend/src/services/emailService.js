// ALE Email Service — Nodemailer + Brevo SMTP
// Falls back to console logging in dev if SMTP env vars not set.

const nodemailer = require('nodemailer');

const FROM = `"${process.env.EMAIL_FROM_NAME || 'ALE Platform'}" <${process.env.EMAIL_FROM || 'noreply@ale.com'}>`;

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // dev fallback
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function send({ to, subject, html }) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const info = await transport.sendMail({
      from: FROM, to, subject, html,
      headers: { 'X-Mailin-no-track-header': '1' },  // disable Brevo click tracking
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[EMAIL ERROR] To: ${to} | Subject: ${subject} | Error: ${err.message}`);
    throw err;
  }
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:560px; margin:32px auto; background:#fff; border-radius:12px;
            border:1px solid #e2e8f0; overflow:hidden; }
    .header { background:linear-gradient(135deg,#4f46e5,#06b6d4); padding:28px 32px; }
    .header h1 { color:#fff; margin:0; font-size:22px; }
    .header p  { color:rgba(255,255,255,.8); margin:4px 0 0; font-size:14px; }
    .body { padding:28px 32px; color:#374151; font-size:14px; line-height:1.7; }
    .btn { display:inline-block; padding:12px 28px; background:#4f46e5; color:#fff;
           text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; margin:16px 0; }
    .footer { padding:16px 32px; background:#f8fafc; font-size:12px; color:#94a3b8;
              border-top:1px solid #e2e8f0; }
    .badge-box { display:inline-block; padding:16px 24px; background:linear-gradient(135deg,#1e1b4b,#312e81);
                 border-radius:12px; text-align:center; margin:16px 0; }
    .badge-icon { font-size:40px; display:block; margin-bottom:8px; }
    .badge-name { color:#a5b4fc; font-weight:700; font-size:16px; }
  </style></head><body>
  <div class="wrap">${content}</div>
  </body></html>`;
}

// ── Email templates ───────────────────────────────────────────────────────────

async function sendVerificationEmail({ to, name, token }) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/auth/verify-email?token=${token}`;
  console.log(`\n[DEV] Verify URL: ${url}\n`);  // copy this from terminal to bypass Brevo redirect
  await send({
    to, subject: 'Verify your ALE Platform email',
    html: wrap(`
      <div class="header"><h1>🧠 ALE Platform</h1><p>Verify your email address</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for joining ALE Platform! Please verify your email address to get started.</p>
        <a href="${url}" class="btn">Verify Email →</a>
        <p style="color:#94a3b8;font-size:13px">Link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

async function sendWelcomeEmail({ to, name }) {
  await send({
    to, subject: `Welcome to ALE Platform, ${name}! 🎉`,
    html: wrap(`
      <div class="header"><h1>🎉 Welcome aboard!</h1><p>Your account is verified</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your email is verified and your ALE Platform account is ready. Here's what to do next:</p>
        <ul>
          <li>Complete your <strong>onboarding</strong> to set your career goal</li>
          <li>Browse the <strong>course catalogue</strong> and enrol in your first course</li>
          <li>Ask <strong>ARIA</strong>, your AI tutor, anything</li>
        </ul>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="btn">Go to Dashboard →</a>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  const url = `${baseUrl}/reset-password?token=${token}`;
  await send({
    to, subject: 'Reset your ALE Platform password',
    html: wrap(`
      <div class="header"><h1>🔑 Password Reset</h1><p>ALE Platform</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click below to set a new one.</p>
        <a href="${url}" class="btn">Reset Password →</a>
        <p style="color:#94a3b8;font-size:13px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

async function sendBadgeAwardEmail({ to, name, badge }) {
  await send({
    to,
    subject: `🏅 You earned the "${badge.name}" badge!`,
    html: wrap(`
      <div class="header"><h1>🏅 Badge Earned!</h1><p>Congratulations, ${name}</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>You just earned a new badge on ALE Platform:</p>
        <div class="badge-box">
          <span class="badge-icon">${badge.icon || '🏅'}</span>
          <span class="badge-name">${badge.name}</span>
        </div>
        <p style="color:#64748b">${badge.description || ''}</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/achievements" class="btn">View All Badges →</a>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

async function sendCourseCompletionEmail({ to, name, courseTitle, xpEarned }) {
  await send({
    to,
    subject: `🎓 You completed "${courseTitle}"!`,
    html: wrap(`
      <div class="header"><h1>🎓 Course Complete!</h1><p>${courseTitle}</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Amazing work — you've completed <strong>${courseTitle}</strong>!</p>
        ${xpEarned ? `<p>You earned <strong style="color:#4f46e5">+${xpEarned} XP</strong> from this course.</p>` : ''}
        <p>Ready to keep going? Check out your learning path for the next recommended course.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/path" class="btn">View Learning Path →</a>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

async function sendCourseUpdateEmail({ to, name, courseTitle, message }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  await send({
    to,
    subject: `Update: "${courseTitle}" has been updated`,
    html: wrap(`
      <div class="header"><h1>📢 Course Update</h1><p>${courseTitle}</p></div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>There's an update to a course you're enrolled in: <strong>${courseTitle}</strong>.</p>
        <p style="background:#f1f5f9;padding:12px 16px;border-radius:8px;border-left:4px solid #4f46e5;margin:12px 0">${message}</p>
        <a href="${frontendUrl}/courses" class="btn">View Course →</a>
      </div>
      <div class="footer">ALE Platform — Adaptive Learning Ecosystem</div>
    `),
  });
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBadgeAwardEmail,
  sendCourseCompletionEmail,
  sendCourseUpdateEmail,
};
