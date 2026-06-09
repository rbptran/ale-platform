const router = require('express').Router();
const { z }  = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const skillService = require('../services/skillService');
const badgeService = require('../services/badgeService');

// GET /assessments/:courseSlug — get question bank (randomised)
router.get('/:courseSlug', requireAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { slug: req.params.courseSlug } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const questions = await prisma.question.findMany({
      where: { courseId: course.id },
      select: { id:true, text:true, type:true, options:true, difficulty:true, xpReward:true },
      // Hide correctAnswer from client
    });

    // Shuffle and limit to 10
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);
    res.json({ questions: shuffled, courseTitle: course.title });
  } catch (err) { next(err); }
});

// POST /assessments/:courseSlug/submit
const submitSchema = z.object({
  answers: z.record(z.string()),   // { questionId: "selected_answer" }
  timeTakenSecs: z.number().int().optional(),
});

router.post('/:courseSlug/submit', requireAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { slug: req.params.courseSlug } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const { answers, timeTakenSecs } = submitSchema.parse(req.body);
    const questionIds = Object.keys(answers);

    const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
    let correct = 0;
    const feedback = {};

    for (const q of questions) {
      const userAnswer = answers[q.id];
      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      const isCorrect = correctArr.includes(userAnswer);
      if (isCorrect) correct++;
      feedback[q.id] = { isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation };
    }

    const scorePct = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    const passed   = scorePct >= 70;
    const xpEarned = passed ? questions.reduce((acc, q) => acc + q.xpReward, 0) : 0;

    // Store attempt
    const attempt = await prisma.assessmentAttempt.create({
      data: { userId: req.user.id, courseId: course.id, scorePct, answers, passed, timeTakenSecs },
    });

    // Update skills
    await skillService.updateFromAssessment(req.user.id, questions, scorePct);

    // Award XP and check badges
    if (xpEarned > 0) {
      await prisma.learnerProfile.update({
        where: { userId: req.user.id },
        data: { xpTotal: { increment: xpEarned } },
      });
    }
    const newBadges = await badgeService.checkAndAward(req.user.id).catch(() => []) || [];

    // Activity event
    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'assessment_submitted', entityType: 'course',
              entityId: course.id, metadata: { scorePct, passed, xpEarned } },
    });

    res.json({ attempt, scorePct, passed, correct, total: questions.length, feedback, xpEarned, newBadges });
  } catch (err) { next(err); }
});

// GET /assessments/history
router.get('/me/history', requireAuth, async (req, res, next) => {
  try {
    const history = await prisma.assessmentAttempt.findMany({
      where: { userId: req.user.id },
      include: { course: { select: { title: true, slug: true } } },
      orderBy: { attemptedAt: 'desc' }, take: 20,
    });
    res.json({ history });
  } catch (err) { next(err); }
});

module.exports = router;
