const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// GET /profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: req.user.id } });
    const skills  = await prisma.userSkill.findMany({ where: { userId: req.user.id }, include: { skill: true } });
    res.json({ profile, skills });
  } catch (err) { next(err); }
});

// PUT /profile
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      careerGoal: z.string().optional(),
      currentRole: z.string().optional(),
      experienceYears: z.number().int().optional(),
      industry: z.string().optional(),
      educationLevel: z.string().optional(),
      learningStyles: z.array(z.string()).optional(),
      dailyCommitmentMins: z.number().int().optional(),
    });
    const data = schema.parse(req.body);
    const profile = await prisma.learnerProfile.update({ where: { userId: req.user.id }, data });
    res.json({ profile });
  } catch (err) { next(err); }
});

// POST /profile/onboarding — save wizard answers + trigger path generation
router.post('/onboarding', requireAuth, async (req, res, next) => {
  try {
    const { careerGoal, level, learningStyles, dailyCommitmentMins, name } = req.body;
    if (name) await prisma.user.update({ where: { id: req.user.id }, data: { name } });
    const profile = await prisma.learnerProfile.update({
      where: { userId: req.user.id },
      data: { careerGoal, learningStyles, dailyCommitmentMins },
    });
    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'onboarding_completed', metadata: { careerGoal } },
    });
    // TODO Sprint 4: trigger async path generation job
    res.json({ profile, message: 'Onboarding saved. Learning path generation queued.' });
  } catch (err) { next(err); }
});

// GET /profile/dashboard
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const profile    = await prisma.learnerProfile.findUnique({ where: { userId: req.user.id } });
    const enrolments = await prisma.enrolment.findMany({
      where: { userId: req.user.id, status: 'active' },
      include: { course: { select: { title: true, slug: true, thumbnailUrl: true } } },
      take: 3, orderBy: { enrolledAt: 'desc' },
    });
    const badges = await prisma.userBadge.findMany({
      where: { userId: req.user.id }, include: { badge: true },
      orderBy: { awardedAt: 'desc' }, take: 5,
    });
    res.json({ profile, activeEnrolments: enrolments, recentBadges: badges });
  } catch (err) { next(err); }
});

// GET /profile/analytics?from=&to=
router.get('/analytics', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { userId: req.user.id };
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to)   where.occurredAt.lte = new Date(to);
    }
    const events = await prisma.activityEvent.findMany({
      where, orderBy: { occurredAt: 'desc' }, take: 500,
    });
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId: req.user.id }, orderBy: { attemptedAt: 'desc' }, take: 20,
    });
    res.json({ events, assessmentHistory: attempts });
  } catch (err) { next(err); }
});

module.exports = router;
