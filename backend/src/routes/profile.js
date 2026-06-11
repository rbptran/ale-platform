const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { extractLearnerInsights, computeReadinessScore } = require('../services/aiService');

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

// PATCH /profile/onboarding — save full wizard answers, mark onboarding complete
router.patch('/onboarding', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      // Step 1 — personal context
      employmentStatus:     z.string().optional(),
      industry:             z.string().optional(),
      currentRole:          z.string().optional(),
      experienceYears:      z.number().int().min(0).max(50).optional(),
      educationLevel:       z.string().optional(),
      // Step 2 — skill self-ratings: [{ skillName, proficiencyPct }]
      skillRatings:         z.array(z.object({
        skillName:      z.string(),
        proficiencyPct: z.number().min(0).max(100),
      })).optional(),
      // Step 3 — learning goals + motivation (Option A)
      goalType:             z.string().optional(),
      careerGoal:           z.string().optional(),
      sixMonthGoal:         z.string().optional(),
      motivationType:       z.string().optional(), // employer_requirement|career_transition|promotion|certification|personal_enrichment|academic
      careerUrgency:        z.number().int().min(1).max(5).optional(),
      // Step 4 — preferences, constraints, accessibility (Option A)
      learningStyles:       z.array(z.string()).optional(),
      weeklyHoursAvailable: z.number().int().min(1).max(168).optional(),
      dailyCommitmentMins:  z.number().int().optional(),
      budgetRange:          z.string().optional(), // free_only|low|medium|high
      hasDeadline:          z.boolean().optional(),
      targetCompletionDate: z.string().optional(),
      accessibilityNeeds:   z.string().optional(),
    });

    const data = schema.parse(req.body);
    const { skillRatings, ...profileData } = data;

    // Compute readiness score from submitted data before saving
    const readinessScore = computeReadinessScore(profileData, null);

    // Save profile fields (include readiness score)
    const profile = await prisma.learnerProfile.update({
      where: { userId: req.user.id },
      data:  { ...profileData, readinessScore, onboardingCompleted: true },
    });

    // Upsert self-rated skills
    if (skillRatings?.length) {
      for (const { skillName, proficiencyPct } of skillRatings) {
        // Find or create the skill definition
        let skill = await prisma.skillDefinition.findFirst({ where: { name: skillName } });
        if (!skill) {
          skill = await prisma.skillDefinition.create({
            data: { name: skillName, category: 'professional' },
          });
        }
        await prisma.userSkill.upsert({
          where:  { userId_skillId: { userId: req.user.id, skillId: skill.id } },
          update: { proficiencyPct, selfRated: true, lastAssessedAt: new Date() },
          create: { userId: req.user.id, skillId: skill.id, proficiencyPct, selfRated: true, lastAssessedAt: new Date() },
        });
      }
    }

    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'onboarding_completed', metadata: { goalType: data.goalType } },
    });

    res.json({ profile, message: 'Onboarding complete.' });
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

// POST /profile/ai-interview — process conversational interview answers, store insights
router.post('/ai-interview', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      answers: z.array(z.object({
        question: z.string(),
        answer:   z.string().min(1),
      })).min(1).max(10),
    });
    const { answers } = schema.parse(req.body);

    // Extract structured insights from AI
    let aiExtractedData = null;
    let aiInterviewSummary = null;
    try {
      aiExtractedData = await extractLearnerInsights(answers);
      aiInterviewSummary = aiExtractedData?.summary || null;
    } catch (aiErr) {
      console.error('[ai-interview] AI extraction failed:', aiErr.message);
      // Store raw answers even if AI fails — don't block the learner
      aiExtractedData = { rawAnswers: answers, error: 'AI extraction failed' };
    }

    // Get current profile to recompute readiness with AI urgency signal
    const currentProfile = await prisma.learnerProfile.findUnique({ where: { userId: req.user.id } });
    const readinessScore = computeReadinessScore(currentProfile || {}, aiExtractedData);

    const profile = await prisma.learnerProfile.update({
      where: { userId: req.user.id },
      data:  { aiExtractedData, aiInterviewSummary, readinessScore },
    });

    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'ai_interview_completed', metadata: { readinessScore } },
    });

    res.json({ profile, aiExtractedData, readinessScore });
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
