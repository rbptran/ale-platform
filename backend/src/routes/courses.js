const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /courses — public catalogue
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { level, tag, search } = req.query;
    const where = { status: 'published' };
    if (level) where.level = level;
    if (tag)   where.tags  = { has: tag };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const courses = await prisma.course.findMany({
      where, orderBy: { displayOrder: 'asc' },
      select: { id:true, slug:true, title:true, description:true, thumbnailUrl:true,
                level:true, estimatedHours:true, tags:true, status:true },
    });
    // If authenticated, attach enrolment status
    let enrolmentMap = {};
    if (req.user) {
      const enrolments = await prisma.enrolment.findMany({ where: { userId: req.user.id } });
      enrolments.forEach(e => { enrolmentMap[e.courseId] = e; });
    }
    const result = courses.map(c => ({ ...c, enrolment: enrolmentMap[c.id] || null }));
    res.json({ courses: result });
  } catch (err) { next(err); }
});

// GET /courses/:slug
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: { modules: { orderBy: { displayOrder: 'asc' }, include: {
        lessons: { orderBy: { displayOrder: 'asc' },
          select: { id:true, title:true, type:true, estimatedMins:true, xpReward:true, isFreePreview:false },
        },
      }}},
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ course });
  } catch (err) { next(err); }
});

// GET /courses/:slug/modules
// Protected — full module + lesson list with per-lesson completion status for enrolled users
router.get('/:slug/modules', requireAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, status: true },
    });
    if (!course || course.status !== 'published') {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrolment = await prisma.enrolment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    });
    if (!enrolment) return res.status(403).json({ error: 'Enrol in this course first' });

    const modules = await prisma.module.findMany({
      where: { courseId: course.id },
      orderBy: { displayOrder: 'asc' },
      include: {
        lessons: {
          orderBy: { displayOrder: 'asc' },
          select: { id:true, title:true, type:true, estimatedMins:true, xpReward:true, displayOrder:true },
        },
      },
    });

    // Fetch all completions for this user + this course in one query
    const allLessonIds = modules.flatMap(m => m.lessons.map(l => l.id));
    const completions  = await prisma.lessonCompletion.findMany({
      where: { userId: req.user.id, lessonId: { in: allLessonIds } },
      select: { lessonId: true, completedAt: true },
    });
    const completedSet = new Map(completions.map(c => [c.lessonId, c.completedAt]));

    const modulesWithStatus = modules.map(mod => ({
      ...mod,
      completedCount: mod.lessons.filter(l => completedSet.has(l.id)).length,
      lessons: mod.lessons.map(lesson => ({
        ...lesson,
        completed:   completedSet.has(lesson.id),
        completedAt: completedSet.get(lesson.id) ?? null,
      })),
    }));

    res.json({
      enrolment: {
        status: enrolment.status,
        progressPct: parseFloat(enrolment.progressPct),
        enrolledAt: enrolment.enrolledAt,
        completedAt: enrolment.completedAt,
      },
      modules: modulesWithStatus,
    });
  } catch (err) { next(err); }
});

// POST /courses/:slug/enrol
router.post('/:slug/enrol', requireAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { slug: req.params.slug } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const enrolment = await prisma.enrolment.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
      create: { userId: req.user.id, courseId: course.id },
      update: { status: 'active' },
    });
    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'course_enrolled', entityType: 'course', entityId: course.id },
    });
    res.status(201).json({ enrolment });
  } catch (err) { next(err); }
});

// GET /courses — enrolments for current user
router.get('/me/enrolments', requireAuth, async (req, res, next) => {
  try {
    const enrolments = await prisma.enrolment.findMany({
      where: { userId: req.user.id },
      include: { course: { select: { slug:true, title:true, thumbnailUrl:true, level:true } } },
      orderBy: { enrolledAt: 'desc' },
    });
    res.json({ enrolments });
  } catch (err) { next(err); }
});

module.exports = router;
