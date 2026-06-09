// ALE Admin Routes
// All routes require role === 'admin' (enforced by requireAuth + requireAdmin).

const router = require('express').Router();
const { z }  = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Apply auth + admin guard to every route in this file
router.use(requireAuth, requireAdmin);

// ── Courses ────────────────────────────────────────────────────────────────

const courseSchema = z.object({
  slug:                  z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  title:                 z.string().min(3).max(255),
  description:           z.string().optional(),
  thumbnailUrl:          z.string().url().optional(),
  level:                 z.enum(['Beginner', 'Intermediate', 'Advanced']),
  estimatedHours:        z.number().positive().optional(),
  tags:                  z.array(z.string()).default([]),
  prerequisiteCourseIds: z.array(z.string().uuid()).default([]),
  displayOrder:          z.number().int().default(0),
  status:                z.enum(['draft', 'published', 'archived']).default('draft'),
  maintenanceMessage:    z.string().nullable().optional(),
});

// POST /admin/courses
router.post('/courses', async (req, res, next) => {
  try {
    const data = courseSchema.parse(req.body);
    const course = await prisma.course.create({
      data: { ...data, createdBy: req.user.id },
    });
    res.status(201).json({ course });
  } catch (err) { next(err); }
});

// PUT /admin/courses/:id
router.put('/courses/:id', async (req, res, next) => {
  try {
    const data = courseSchema.partial().parse(req.body);
    // Auto-set publishedAt when status flips to published
    if (data.status === 'published') {
      const existing = await prisma.course.findUnique({ where: { id: req.params.id }, select: { publishedAt: true } });
      if (!existing?.publishedAt) data.publishedAt = new Date();
    }
    const course = await prisma.course.update({ where: { id: req.params.id }, data });
    res.json({ course });
  } catch (err) { next(err); }
});

// GET /admin/courses — list ALL courses (any status), no enrolment check
router.get('/courses', async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true, slug: true, title: true, description: true,
        level: true, estimatedHours: true, tags: true,
        status: true, displayOrder: true, publishedAt: true,
        prerequisiteCourseIds: true, maintenanceMessage: true,
        _count: { select: { modules: true, enrolments: true } },
      },
    });
    res.json({ courses });
  } catch (err) { next(err); }
});

// GET /admin/courses/:id — full detail: modules + lessons (with content) + questions
// No enrolment check, no status filter — works on drafts too.
router.get('/courses/:id', async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          orderBy: { displayOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true, title: true, type: true,
                displayOrder: true, estimatedMins: true, xpReward: true,
                contentBody: true, videoAssetId: true,
              },
            },
          },
        },
        questions: {
          select: {
            id: true, text: true, options: true,
            correctAnswer: true, explanation: true,
            skillTags: true, xpReward: true,
          },
        },
      },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ course });
  } catch (err) { next(err); }
});

// POST /admin/courses/generate — Gemini AI topic-based course generation
router.post('/courses/generate', async (req, res, next) => {
  try {
    const { topic, level, numModules, targetAudience } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'topic is required' });
    const { generateCourseFromTopic } = require('../services/aiService');
    const course = await generateCourseFromTopic({
      topic: topic.trim(),
      level: level || 'Beginner',
      numModules: Math.min(Math.max(parseInt(numModules) || 3, 1), 8),
      targetAudience,
    });
    res.json({ course });
  } catch (err) { next(err); }
});

// GET /admin/courses/learner-context/:userId — profile preview before generating
router.get('/courses/learner-context/:userId', async (req, res, next) => {
  try {
    const { getLearnerContext } = require('../services/aiService');
    const context = await getLearnerContext(prisma, req.params.userId);
    res.json({ context });
  } catch (err) { next(err); }
});

// POST /admin/courses/generate-for-learner/:userId — personalised course generation
router.post('/courses/generate-for-learner/:userId', async (req, res, next) => {
  try {
    const { numModules } = req.body;
    const { generateCourseForLearner } = require('../services/aiService');
    const result = await generateCourseForLearner(
      prisma,
      req.params.userId,
      Math.min(Math.max(parseInt(numModules) || 3, 1), 8),
    );
    res.json(result);
  } catch (err) { next(err); }
});

// POST /admin/courses/:id/maintenance — set or clear maintenance message
router.post('/courses/:id/maintenance', async (req, res, next) => {
  try {
    const { message } = req.body; // string to set, null/empty to clear
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { maintenanceMessage: message || null },
      select: { id: true, title: true, maintenanceMessage: true },
    });
    res.json({ course });
  } catch (err) { next(err); }
});

// POST /admin/courses/:id/notify-learners — email all active enrolees
router.post('/courses/:id/notify-learners', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      select: { title: true },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const enrolments = await prisma.enrolment.findMany({
      where: { courseId: req.params.id, status: { not: 'dropped' } },
      include: { user: { select: { email: true, name: true } } },
    });
    const emailService = require('../services/emailService');
    let sent = 0;
    for (const e of enrolments) {
      try {
        await emailService.sendCourseUpdateEmail({
          to: e.user.email, name: e.user.name,
          courseTitle: course.title, message,
        });
        sent++;
      } catch { /* continue on individual failures */ }
    }
    res.json({ sent, total: enrolments.length });
  } catch (err) { next(err); }
});

// ── Modules ────────────────────────────────────────────────────────────────

const moduleSchema = z.object({
  title:         z.string().min(2).max(255),
  displayOrder:  z.number().int(),
  estimatedMins: z.number().int().positive().optional(),
  isFreePreview: z.boolean().default(false),
});

// POST /admin/courses/:id/modules
router.post('/courses/:id/modules', async (req, res, next) => {
  try {
    const data   = moduleSchema.parse(req.body);
    const module = await prisma.module.create({
      data: { ...data, courseId: req.params.id },
    });
    res.status(201).json({ module });
  } catch (err) { next(err); }
});

// ── Lessons ────────────────────────────────────────────────────────────────

const lessonSchema = z.object({
  title:            z.string().min(2).max(255),
  type:             z.enum(['video', 'text', 'quiz', 'project', 'simulation']),
  displayOrder:     z.number().int(),
  contentBody:      z.string().optional(),       // Markdown/HTML for text lessons
  videoAssetId:     z.string().optional(),       // YouTube video ID or Mux asset ID
  videoDurationSecs: z.number().int().positive().optional(),
  estimatedMins:    z.number().int().positive().optional(),
  xpReward:         z.number().int().default(10),
});

// POST /admin/modules/:id/lessons
router.post('/modules/:id/lessons', async (req, res, next) => {
  try {
    const data   = lessonSchema.parse(req.body);
    const lesson = await prisma.lesson.create({
      data: { ...data, moduleId: req.params.id },
    });
    res.status(201).json({ lesson });
  } catch (err) { next(err); }
});

// PUT /admin/lessons/:id
router.put('/lessons/:id', async (req, res, next) => {
  try {
    const data   = lessonSchema.partial().parse(req.body);
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
    res.json({ lesson });
  } catch (err) { next(err); }
});

// ── Questions ──────────────────────────────────────────────────────────────

const questionSchema = z.object({
  text:          z.string().min(5),
  type:          z.enum(['mcq', 'multi_select', 'true_false', 'short_answer']),
  options:       z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation:   z.string().optional(),
  difficulty:    z.enum(['easy', 'medium', 'hard']).default('medium'),
  skillTags:     z.array(z.string()).default([]),
  xpReward:      z.number().int().default(5),
  lessonId:      z.string().uuid().optional(),
  courseId:      z.string().uuid().optional(),
});

// POST /admin/questions
router.post('/questions', async (req, res, next) => {
  try {
    const data     = questionSchema.parse(req.body);
    const question = await prisma.question.create({ data });
    res.status(201).json({ question });
  } catch (err) { next(err); }
});

// ── Badges ─────────────────────────────────────────────────────────────────

const badgeSchema = z.object({
  name:          z.string().min(2).max(255),
  description:   z.string().optional(),
  icon:          z.string().optional(),
  criteriaType:  z.enum(['course_complete', 'streak', 'score', 'xp_threshold', 'manual']),
  criteriaValue: z.record(z.unknown()),  // { courseId, days, minScore, xp } depending on type
});

// POST /admin/badges
router.post('/badges', async (req, res, next) => {
  try {
    const data  = badgeSchema.parse(req.body);
    const badge = await prisma.badge.create({ data });
    res.status(201).json({ badge });
  } catch (err) { next(err); }
});

// ── Users ──────────────────────────────────────────────────────────────────

// GET /admin/users — list all learners with profile, skills, and enrolment summary
router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'learner' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        profile: {
          select: {
            careerGoal: true, currentRole: true, experienceYears: true,
            industry: true, xpTotal: true, level: true, streakDays: true,
          },
        },
        userSkills: {
          include: { skill: { select: { name: true, category: true } } },
          orderBy: { proficiencyPct: 'desc' },
        },
        _count: {
          select: { enrolments: true, lessonCompletions: true },
        },
        enrolments: {
          include: { course: { select: { title: true, tags: true, level: true, status: true } } },
          orderBy: { enrolledAt: 'desc' },
        },
        assessmentAttempts: {
          select: { scorePct: true, passed: true, courseId: true },
          orderBy: { attemptedAt: 'desc' },
          take: 20,
        },
      },
    });
    res.json({ users });
  } catch (err) { next(err); }
});

// ── Platform Analytics ─────────────────────────────────────────────────────

// GET /admin/analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      totalEnrolments,
      completedEnrolments,
      totalPosts,
      courseCompletionRates,
      topCourses,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.enrolment.count(),
      prisma.enrolment.count({ where: { status: 'completed' } }),
      prisma.post.count(),
      prisma.enrolment.groupBy({
        by: ['courseId'],
        _count: { id: true },
        where: { status: 'completed' },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.course.findMany({
        where: { status: 'published' },
        select: {
          id: true, title: true, slug: true, level: true,
          _count: { select: { enrolments: true } },
        },
        orderBy: { enrolments: { _count: 'desc' } },
        take: 10,
      }),
    ]);

    // MAU: users with at least one event in the last 30 days
    const mauResult = await prisma.activityEvent.groupBy({
      by: ['userId'],
      where: { occurredAt: { gte: thirtyDaysAgo } },
    });
    const mau = mauResult.length;

    const completionRate = totalEnrolments > 0
      ? parseFloat(((completedEnrolments / totalEnrolments) * 100).toFixed(1))
      : 0;

    res.json({
      overview: {
        totalUsers,
        newUsersThisMonth,
        mau,
        totalEnrolments,
        completedEnrolments,
        completionRate,
        totalPosts,
      },
      topCourses,
      topCompletedCourseIds: courseCompletionRates,
    });
  } catch (err) { next(err); }
});

module.exports = router;
