const router = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// GET /badges
// All badge definitions with earned/not-earned status for the current user.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [allBadges, earnedBadges] = await Promise.all([
      prisma.badge.findMany({ orderBy: { name: 'asc' } }),
      prisma.userBadge.findMany({
        where: { userId: req.user.id },
        select: { badgeId: true, awardedAt: true },
      }),
    ]);

    const earnedMap = {};
    earnedBadges.forEach(b => { earnedMap[b.badgeId] = b.awardedAt; });

    const badges = allBadges.map(b => ({
      id:           b.id,
      name:         b.name,
      description:  b.description,
      icon:         b.icon,
      criteriaType: b.criteriaType,
      earned:       !!earnedMap[b.id],
      awardedAt:    earnedMap[b.id] ?? null,
    }));

    res.json({ badges, earnedCount: earnedBadges.length, totalCount: allBadges.length });
  } catch (err) { next(err); }
});

// GET /badges/earned
// Only the badges this user has actually earned, with full badge details.
router.get('/earned', requireAuth, async (req, res, next) => {
  try {
    const earned = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
    res.json({ badges: earned });
  } catch (err) { next(err); }
});

module.exports = router;
