const prisma = require('../lib/prisma');
const emailService = require('./emailService');

async function checkAndAward(userId) {
  const [profile, enrolments, attempts, earnedBadgeIds, allBadges] = await Promise.all([
    prisma.learnerProfile.findUnique({ where: { userId } }),
    prisma.enrolment.findMany({ where: { userId, status: 'completed' } }),
    prisma.assessmentAttempt.findMany({ where: { userId } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }).then(r => r.map(b => b.badgeId)),
    prisma.badge.findMany(),
  ]);

  if (!profile) return;

  const newlyAwarded = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.includes(badge.id)) continue; // already earned

    const criteria = badge.criteriaValue;
    let earned = false;

    switch (badge.criteriaType) {
      case 'course_complete':
        earned = enrolments.some(e => e.courseId === criteria.courseId);
        break;
      case 'streak':
        earned = profile.streakDays >= (criteria.days || 0);
        break;
      case 'score':
        earned = attempts.some(a => parseFloat(a.scorePct) >= (criteria.minScore || 0));
        break;
      case 'xp_threshold':
        earned = profile.xpTotal >= (criteria.xp || 0);
        break;
      default:
        break;
    }

    if (earned) {
      try {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        await prisma.activityEvent.create({
          data: { userId, eventType: 'badge_awarded', entityType: 'badge', entityId: badge.id,
                  metadata: { badgeName: badge.name } },
        });
        newlyAwarded.push(badge);

        // Send badge award email (non-blocking)
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (user) {
          emailService.sendBadgeAwardEmail({ to: user.email, name: user.name, badge }).catch(() => {});
        }
      } catch {
        // Ignore duplicate award race condition
      }
    }
  }

  return newlyAwarded;
}

module.exports = { checkAndAward };
