const router = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// GET /skills
// Returns all skill definitions annotated with the current user's proficiency.
// Groups by category for the front-end radar/domain chart.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [allSkills, userSkills] = await Promise.all([
      prisma.skillDefinition.findMany({ orderBy: { name: 'asc' } }),
      prisma.userSkill.findMany({
        where: { userId: req.user.id },
        select: {
          skillId: true, proficiencyPct: true,
          evidenceCount: true, lastAssessedAt: true,
        },
      }),
    ]);

    const userMap = {};
    userSkills.forEach(us => { userMap[us.skillId] = us; });

    const skills = allSkills.map(s => ({
      id:             s.id,
      name:           s.name,
      category:       s.category,
      description:    s.description,
      icon:           s.icon,
      proficiencyPct: userMap[s.id] ? parseFloat(userMap[s.id].proficiencyPct) : 0,
      evidenceCount:  userMap[s.id]?.evidenceCount ?? 0,
      lastAssessedAt: userMap[s.id]?.lastAssessedAt ?? null,
      assessed:       !!userMap[s.id],
    }));

    // Group by category
    const byCategory = {};
    skills.forEach(s => {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    });

    // Domain averages for radar chart
    const domainAverages = Object.fromEntries(
      Object.entries(byCategory).map(([cat, items]) => {
        const avg = items.reduce((sum, s) => sum + s.proficiencyPct, 0) / items.length;
        return [cat, parseFloat(avg.toFixed(1))];
      }),
    );

    res.json({ skills, byCategory, domainAverages });
  } catch (err) { next(err); }
});

module.exports = router;
