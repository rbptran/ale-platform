// Lesson completion pipeline — runs inside a DB transaction
const prisma = require('../lib/prisma');
const badgeService   = require('./badgeService');
const emailService   = require('./emailService');

async function completeLesson({ userId, lessonId, timeSpentSecs }) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch lesson + parent module + course
    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw Object.assign(new Error('Lesson not found'), { status: 404 });

    const courseId = lesson.module.courseId;

    // 2. Check enrolment
    const enrolment = await tx.enrolment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolment) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });

    // 3. Idempotent completion (skip if already done)
    const alreadyDone = await tx.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (alreadyDone) {
      return { alreadyCompleted: true, message: 'Lesson already marked complete' };
    }

    await tx.lessonCompletion.create({ data: { userId, lessonId, timeSpentSecs } });

    // 4. Recalculate course progress
    const totalLessons = await tx.lesson.count({
      where: { module: { courseId } },
    });
    const doneLessons = await tx.lessonCompletion.count({
      where: { userId, lesson: { module: { courseId } } },
    });
    const progressPct = totalLessons > 0 ? (doneLessons / totalLessons) * 100 : 0;
    const isComplete  = progressPct >= 100;

    await tx.enrolment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progressPct,
        status: isComplete ? 'completed' : 'active',
        completedAt: isComplete ? new Date() : null,
      },
    });

    // 5. Award XP
    const xpEarned = lesson.xpReward || 10;
    const updatedProfile = await tx.learnerProfile.update({
      where: { userId },
      data: { xpTotal: { increment: xpEarned } },
    });

    // 6. Update level (every 200 XP = 1 level)
    const newLevel = Math.floor(updatedProfile.xpTotal / 200) + 1;
    if (newLevel > updatedProfile.level) {
      await tx.learnerProfile.update({ where: { userId }, data: { level: newLevel } });
    }

    // 7. Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = updatedProfile.streakLastDate
      ? updatedProfile.streakLastDate.toISOString().split('T')[0]
      : null;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = lastDate === yesterday ? updatedProfile.streakDays + 1 : 1;
      await tx.learnerProfile.update({
        where: { userId },
        data: { streakDays: newStreak, streakLastDate: new Date() },
      });
    }

    // 8. Activity event
    await tx.activityEvent.create({
      data: {
        userId, eventType: 'lesson_completed',
        entityType: 'lesson', entityId: lessonId,
        metadata: { xpEarned, progressPct, courseCompleted: isComplete },
      },
    });

    return { progressPct, xpEarned, courseCompleted: isComplete, lessonId,
             courseTitle: lesson.module.course.title };
  }).then(async (result) => {
    // 9. Badge check runs outside transaction — returns newly awarded badges
    const newBadges = await badgeService.checkAndAward(userId).catch(() => []);

    // 10. Course completion email (non-blocking)
    if (result.courseCompleted) {
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
        .then(user => {
          if (user) {
            const courseTitle = result.courseTitle || 'your course';
            emailService.sendCourseCompletionEmail({
              to: user.email, name: user.name,
              courseTitle, xpEarned: result.xpEarned,
            }).catch(() => {});
          }
        }).catch(() => {});
    }

    return { ...result, newBadges: newBadges || [] };
  });
}

module.exports = { completeLesson };
