const router = require('express').Router();
const { z }  = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /posts
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { courseId, search, sort = 'recent', cursor, limit = '20' } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { body:  { contains: search, mode: 'insensitive' } },
    ];
    const orderBy = sort === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' };
    const posts = await prisma.post.findMany({
      where, orderBy, take: parseInt(limit),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { reactions: true, replies: true } },
        reactions: { select: { type: true, userId: true } },
      },
    });

    // Attach per-type counts and current user's reactions to each post
    const enriched = posts.map(post => {
      const reactionCounts = { like: 0, helpful: 0, bookmark: 0 };
      const myReactionTypes = [];
      for (const r of post.reactions) {
        if (reactionCounts[r.type] !== undefined) reactionCounts[r.type]++;
        if (req.user && r.userId === req.user.id) myReactionTypes.push(r.type);
      }
      const { reactions, ...rest } = post;
      return { ...rest, reactionCounts, reactions: myReactionTypes.map(type => ({ type })) };
    });

    res.json({ posts: enriched });
  } catch (err) { next(err); }
});

// POST /posts
const postSchema = z.object({
  title:    z.string().min(5).max(500),
  body:     z.string().min(10),
  courseId: z.string().uuid().optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = postSchema.parse(req.body);
    const post = await prisma.post.create({
      data: { ...data, userId: req.user.id },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    await prisma.activityEvent.create({
      data: { userId: req.user.id, eventType: 'post_created', entityType: 'post', entityId: post.id },
    });
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

// GET /posts/:id — single post with reaction summary
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user:     { select: { id: true, name: true, avatarUrl: true } },
        _count:   { select: { reactions: true, replies: true } },
        reactions: req.user
          ? { where: { userId: req.user.id }, select: { type: true } }
          : false,
      },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment view count (fire-and-forget)
    prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    res.json({ post });
  } catch (err) { next(err); }
});

// POST /posts/:id/react — idempotent toggle
router.post('/:id/react', requireAuth, async (req, res, next) => {
  try {
    const { type } = z.object({ type: z.enum(['like', 'helpful', 'bookmark']) }).parse(req.body);
    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId_type: { postId: req.params.id, userId: req.user.id, type } },
    });
    if (existing) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      return res.json({ reacted: false, type });
    }
    await prisma.postReaction.create({ data: { postId: req.params.id, userId: req.user.id, type } });
    res.json({ reacted: true, type });
  } catch (err) { next(err); }
});

// GET /posts/:id/replies — paginated thread
router.get('/:id/replies', optionalAuth, async (req, res, next) => {
  try {
    const { cursor, limit = '20' } = req.query;
    const replies = await prisma.postReply.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const nextCursor = replies.length === parseInt(limit)
      ? replies[replies.length - 1].id
      : null;

    res.json({ replies, nextCursor });
  } catch (err) { next(err); }
});

// POST /posts/:id/replies — add a reply
const replySchema = z.object({
  body: z.string().min(1).max(5000),
});

router.post('/:id/replies', requireAuth, async (req, res, next) => {
  try {
    const { body } = replySchema.parse(req.body);

    // Verify parent post exists
    const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const reply = await prisma.postReply.create({
      data: { postId: req.params.id, userId: req.user.id, body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.status(201).json({ reply });
  } catch (err) { next(err); }
});

module.exports = router;
