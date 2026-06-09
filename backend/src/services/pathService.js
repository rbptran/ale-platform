// ALE Path Generation Service
// Uses Google Gemini Flash (Option B — free) to generate a personalised course sequence.
// To upgrade to Claude Sonnet (Option A): swap the callGemini function for an Anthropic SDK call.

const prisma = require('../lib/prisma');

// ── Gemini REST helper (no SDK needed — Node 18+ fetch is built-in) ──────────
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');

  return JSON.parse(text);
}

// ── Build the prompt from learner context ────────────────────────────────────
function buildPrompt(profile, userSkills, completedCourseIds, catalogue) {
  const completedIds = new Set(completedCourseIds);
  const available = catalogue.filter(c => !completedIds.has(c.id));

  const skillSummary = userSkills.length > 0
    ? userSkills.map(s => `${s.skill.name}: ${s.proficiencyPct}%`).join(', ')
    : 'No skills assessed yet';

  const courseSummary = available
    .map(c => `{ "id": "${c.id}", "title": "${c.title}", "level": "${c.level}", "tags": ${JSON.stringify(c.tags)} }`)
    .join('\n');

  return `You are a learning path advisor for an online education platform.

LEARNER PROFILE:
- Career goal: ${profile.careerGoal || 'Not specified'}
- Current role: ${profile.currentRole || 'Not specified'}
- Experience: ${profile.experienceYears ?? 0} years
- Industry: ${profile.industry || 'Not specified'}
- Education: ${profile.educationLevel || 'Not specified'}
- Learning styles: ${(profile.learningStyles || []).join(', ') || 'Not specified'}
- Daily commitment: ${profile.dailyCommitmentMins ?? 30} minutes/day
- Current skill levels: ${skillSummary}

AVAILABLE COURSES (not yet completed):
${courseSummary}

TASK:
Return a JSON array of up to 6 course IDs ordered from most to least recommended for this learner.
For each item include:
- course_id: the exact UUID from the list above
- rationale: one sentence explaining why this course fits the learner (max 100 chars)
- estimated_weeks: realistic weeks to complete at their daily commitment level

Respond ONLY with a valid JSON array, no surrounding text. Example format:
[{"course_id":"...","rationale":"...","estimated_weeks":3}]`;
}

// ── Main generation function (runs async, updates job status) ────────────────
async function generatePath(userId, jobId) {
  try {
    // Load all context in parallel
    const [profile, userSkills, completedEnrolments, catalogue] = await Promise.all([
      prisma.learnerProfile.findUnique({
        where: { userId },
        select: {
          careerGoal: true, currentRole: true, experienceYears: true,
          industry: true, educationLevel: true, learningStyles: true,
          dailyCommitmentMins: true,
        },
      }),
      prisma.userSkill.findMany({
        where: { userId },
        include: { skill: { select: { name: true } } },
        orderBy: { proficiencyPct: 'desc' },
        take: 10,
      }),
      prisma.enrolment.findMany({
        where: { userId, status: 'completed' },
        select: { courseId: true },
      }),
      prisma.course.findMany({
        where: { status: 'published' },
        select: { id: true, title: true, level: true, tags: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    const completedIds = completedEnrolments.map(e => e.courseId);
    const prompt = buildPrompt(profile, userSkills, completedIds, catalogue);

    // Call Gemini
    const recommendations = await callGemini(prompt);

    // Validate returned course IDs exist in DB
    const catalogueIdSet = new Set(catalogue.map(c => c.id));
    const validItems = recommendations.filter(r => catalogueIdSet.has(r.course_id));

    if (validItems.length === 0) {
      throw new Error('Gemini returned no valid course IDs');
    }

    // Deactivate previous paths for this user
    await prisma.learningPath.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // Create new LearningPath + items in a transaction
    const path = await prisma.$transaction(async (tx) => {
      const newPath = await tx.learningPath.create({ data: { userId } });

      await tx.learningPathItem.createMany({
        data: validItems.map((item, idx) => ({
          pathId:         newPath.id,
          courseId:       item.course_id,
          displayOrder:   idx + 1,
          rationale:      item.rationale || null,
          estimatedWeeks: item.estimated_weeks || null,
        })),
      });

      // Link path to learner profile
      await tx.learnerProfile.update({
        where: { userId },
        data: { activePathId: newPath.id },
      });

      return newPath;
    });

    // Mark job complete
    await prisma.pathGenerationJob.update({
      where: { id: jobId },
      data: { status: 'complete', completedAt: new Date() },
    });

    // Activity event
    await prisma.activityEvent.create({
      data: {
        userId,
        eventType: 'path_generated',
        entityType: 'learning_path',
        entityId:   path.id,
        metadata:   { courseCount: validItems.length },
      },
    });

    return path.id;
  } catch (err) {
    console.error('[pathService] Generation failed:', err.message);
    await prisma.pathGenerationJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: err.message, completedAt: new Date() },
    }).catch(() => {});
    throw err;
  }
}

module.exports = { generatePath };
