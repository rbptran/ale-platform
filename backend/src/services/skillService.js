const prisma = require('../lib/prisma');

// Update skill proficiency after an assessment
async function updateFromAssessment(userId, questions, scorePct) {
  // Collect all skill tags from the questions
  const tagSet = new Set();
  for (const q of questions) {
    (q.skillTags || []).forEach(t => tagSet.add(t));
  }

  for (const skillName of tagSet) {
    // Find or create the skill definition
    let skill = await prisma.skillDefinition.findUnique({ where: { name: skillName } });
    if (!skill) {
      skill = await prisma.skillDefinition.create({
        data: { name: skillName, category: 'technical', icon: '⚡' },
      });
    }

    // Get existing user skill
    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId: skill.id } },
    });

    // Weighted moving average: new = (existing × evidenceCount + score) / (evidenceCount + 1)
    const prevPct   = existing ? parseFloat(existing.proficiencyPct) : 0;
    const prevCount = existing ? existing.evidenceCount : 0;
    const newPct    = ((prevPct * prevCount) + parseFloat(scorePct)) / (prevCount + 1);

    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      create: { userId, skillId: skill.id, proficiencyPct: newPct, evidenceCount: 1, lastAssessedAt: new Date() },
      update: { proficiencyPct: newPct, evidenceCount: { increment: 1 }, lastAssessedAt: new Date() },
    });
  }
}

module.exports = { updateFromAssessment };
