const router  = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const progressService = require('../services/progressService');

// GET /lessons/:id — full content (requires enrolment or free preview)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Check enrolment (unless free preview)
    if (!lesson.isFreePreview) {
      const enrolment = await prisma.enrolment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: lesson.module.courseId } },
      });
      if (!enrolment) return res.status(403).json({ error: 'Enrol in this course to access this lesson' });
    }

    // Check if already completed
    const completion = await prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
    });

    res.json({ lesson, isCompleted: !!completion });
  } catch (err) { next(err); }
});

// POST /lessons/:id/complete — full pipeline
router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const { timeSpentSecs } = req.body;
    const result = await progressService.completeLesson({
      userId: req.user.id,
      lessonId: req.params.id,
      timeSpentSecs,
    });
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
