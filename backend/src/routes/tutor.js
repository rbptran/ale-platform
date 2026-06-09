const router = require('express').Router();
const { z }  = require('zod');
const { requireAuth } = require('../middleware/auth');
const { tutorLimiter } = require('../middleware/rateLimiter');
const tutorService = require('../services/tutorService');
const prisma = require('../lib/prisma');

// POST /tutor/chat
const chatSchema = z.object({
  message:         z.string().min(1).max(2000),
  contextCourseId: z.string().uuid().optional(),
});

router.post('/chat', requireAuth, tutorLimiter, async (req, res, next) => {
  try {
    const { message, contextCourseId } = chatSchema.parse(req.body);
    const response = await tutorService.chat(req.user.id, message, contextCourseId);
    res.json({ response });
  } catch (err) { next(err); }
});

// GET /tutor/history
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const messages = await prisma.tutorMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    res.json({ messages });
  } catch (err) { next(err); }
});

// DELETE /tutor/history
router.delete('/history', requireAuth, async (req, res, next) => {
  try {
    await prisma.tutorMessage.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'Conversation history cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
