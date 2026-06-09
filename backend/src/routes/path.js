const router      = require('express').Router();
const { z }       = require('zod');
const prisma      = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const pathService = require('../services/pathService');

// ── GET /path ─────────────────────────────────────────────────────────────────
// Returns the active learning path with progress per course and estimated
// completion date.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user.id },
      select: { activePathId: true },
    });

    if (!profile?.activePathId) {
      return res.json({ path: null, message: 'No learning path generated yet. POST /path/generate to create one.' });
    }

    const path = await prisma.learningPath.findUnique({
      where: { id: profile.activePathId },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            course: {
              select: {
                id: true, slug: true, title: true, level: true,
                estimatedHours: true, thumbnailUrl: true, tags: true,
              },
            },
          },
        },
      },
    });

    if (!path) return res.status(404).json({ error: 'Learning path not found' });

    // Attach enrolment progress to each item
    const courseIds   = path.items.map(i => i.courseId);
    const enrolments  = await prisma.enrolment.findMany({
      where: { userId: req.user.id, courseId: { in: courseIds } },
      select: { courseId: true, status: true, progressPct: true },
    });
    const enrolMap = {};
    enrolments.forEach(e => { enrolMap[e.courseId] = e; });

    // Estimate completion date based on daily commitment
    const profileFull = await prisma.learnerProfile.findUnique({
      where: { userId: req.user.id },
      select: { dailyCommitmentMins: true },
    });
    const dailyMins = profileFull?.dailyCommitmentMins ?? 30;

    const items = path.items.map(item => {
      const enrolment = enrolMap[item.courseId] || null;
      const weeksLeft = item.estimatedWeeks
        ? Math.max(0, item.estimatedWeeks * (1 - (enrolment ? parseFloat(enrolment.progressPct) / 100 : 0)))
        : null;
      return {
        ...item,
        enrolment,
        weeksRemaining: weeksLeft ? parseFloat(weeksLeft.toFixed(1)) : null,
      };
    });

    // Rough estimated completion date
    const totalWeeksLeft = items.reduce((sum, i) => sum + (i.weeksRemaining ?? 0), 0);
    const estimatedCompletionDate = totalWeeksLeft > 0
      ? new Date(Date.now() + totalWeeksLeft * 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
      : null;

    res.json({
      path: {
        id:                    path.id,
        generatedAt:           path.generatedAt,
        items,
        estimatedCompletionDate,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /path/generate ───────────────────────────────────────────────────────
// Kicks off async AI path generation. Returns a jobId to poll.
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    // Create a job record immediately
    const job = await prisma.pathGenerationJob.create({
      data: { userId: req.user.id, status: 'pending' },
    });

    // Run generation asynchronously — don't await so we return fast
    setImmediate(() => {
      pathService.generatePath(req.user.id, job.id).catch(err => {
        console.error('[path/generate] Background job failed:', err.message);
      });
    });

    res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) { next(err); }
});

// ── GET /path/generate/:jobId ─────────────────────────────────────────────────
// Poll generation status: "pending" | "complete" | "failed"
router.get('/generate/:jobId', requireAuth, async (req, res, next) => {
  try {
    const job = await prisma.pathGenerationJob.findUnique({
      where: { id: req.params.jobId },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    res.json({ jobId: job.id, status: job.status, error: job.error ?? null });
  } catch (err) { next(err); }
});

// ── PUT /path/reorder ─────────────────────────────────────────────────────────
// Learner manually reorders remaining path items.
// Body: { course_ids: ["uuid1", "uuid2", ...] }
const reorderSchema = z.object({
  course_ids: z.array(z.string().uuid()).min(1),
});

router.put('/reorder', requireAuth, async (req, res, next) => {
  try {
    const { course_ids } = reorderSchema.parse(req.body);

    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user.id },
      select: { activePathId: true },
    });

    if (!profile?.activePathId) {
      return res.status(404).json({ error: 'No active learning path found' });
    }

    // Update displayOrder for each item in a transaction
    await prisma.$transaction(
      course_ids.map((courseId, idx) =>
        prisma.learningPathItem.updateMany({
          where: { pathId: profile.activePathId, courseId },
          data:  { displayOrder: idx + 1 },
        }),
      ),
    );

    res.json({ message: 'Path reordered successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
