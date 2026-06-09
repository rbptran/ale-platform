const router = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// GET /leaderboard?tab=xp|streak|badges&limit=10
// Returns top learners for each category. Caller is authenticated so we
// can highlight the current user's rank.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 25);

    // ── Top XP ─────────────────────────────────────────────────────────────
    const topXp = await prisma.learnerProfile.findMany({
      orderBy: { xpTotal: 'desc' },
      take: limit,
      select: {
        xpTotal: true, level: true, streakDays: true,
        user: { select: { id: true, name: true } },
      },
    });

    // ── Top Streak ──────────────────────────────────────────────────────────
    const topStreak = await prisma.learnerProfile.findMany({
      orderBy: { streakDays: 'desc' },
      take: limit,
      where: { streakDays: { gt: 0 } },
      select: {
        streakDays: true, xpTotal: true, level: true,
        user: { select: { id: true, name: true } },
      },
    });

    // ── Top Badge Earners ───────────────────────────────────────────────────
    const badgeCounts = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: { badgeId: true },
      orderBy: { _count: { badgeId: 'desc' } },
      take: limit,
    });

    // Hydrate with user info
    const badgeUserIds = badgeCounts.map(b => b.userId);
    const badgeUsers   = await prisma.user.findMany({
      where: { id: { in: badgeUserIds } },
      select: { id: true, name: true },
    });
    const badgeUserMap = Object.fromEntries(badgeUsers.map(u => [u.id, u]));

    const topBadges = badgeCounts.map(b => ({
      user:       badgeUserMap[b.userId] || { id: b.userId, name: 'Unknown' },
      badgeCount: b._count.badgeId,
    }));

    // ── Current user ranks ──────────────────────────────────────────────────
    const myProfile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user.id },
      select: { xpTotal: true, streakDays: true, level: true },
    });
    const myBadgeCount = await prisma.userBadge.count({ where: { userId: req.user.id } });

    const myXpRank = myProfile
      ? await prisma.learnerProfile.count({ where: { xpTotal: { gt: myProfile.xpTotal } } }) + 1
      : null;
    const myStreakRank = myProfile
      ? await prisma.learnerProfile.count({ where: { streakDays: { gt: myProfile.streakDays } } }) + 1
      : null;
    const myBadgeRank = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS rank
      FROM (
        SELECT "user_id", COUNT(*) AS cnt
        FROM "user_badges"
        GROUP BY "user_id"
        HAVING COUNT(*) > ${myBadgeCount}
      ) sub
    `.then(r => Number(r[0]?.rank ?? 1));

    res.json({
      topXp:     topXp.map((p, i) => ({ rank: i + 1, user: p.user, xpTotal: p.xpTotal, level: p.level })),
      topStreak: topStreak.map((p, i) => ({ rank: i + 1, user: p.user, streakDays: p.streakDays, xpTotal: p.xpTotal })),
      topBadges: topBadges.map((b, i) => ({ rank: i + 1, user: b.user, badgeCount: b.badgeCount })),
      me: {
        userId:     req.user.id,
        xpTotal:    myProfile?.xpTotal ?? 0,
        level:      myProfile?.level ?? 1,
        streakDays: myProfile?.streakDays ?? 0,
        badgeCount: myBadgeCount,
        xpRank:     myXpRank,
        streakRank: myStreakRank,
        badgeRank:  myBadgeRank,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
