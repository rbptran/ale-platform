// ALE AI Service — Groq (Llama 3.3-70B) for structured course generation
// Uses the groq-sdk already installed in this project.

const Groq = require('groq-sdk');

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .substring(0, 80) || 'ai-course';
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment');
  return new Groq({ apiKey });
}

async function callGroq(prompt) {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are an expert instructional designer. You always respond with valid JSON only — no markdown, no explanations, no extra text.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no content');

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('AI response was not valid JSON');
  }
}

// ── Learner Profile Analysis ──────────────────────────────────────────────────

/**
 * Build a rich learner context object from DB data.
 * Used to construct a detailed personalised prompt.
 */
async function buildLearnerContext(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      profile: {
        select: {
          careerGoal: true, currentRole: true, experienceYears: true,
          industry: true, xpTotal: true, level: true, streakDays: true,
        },
      },
      userSkills: {
        include: { skill: { select: { name: true, category: true } } },
        orderBy: { proficiencyPct: 'desc' },
      },
      enrolments: {
        include: {
          course: { select: { title: true, tags: true, level: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      },
      assessmentAttempts: {
        select: { scorePct: true, passed: true, courseId: true, attemptedAt: true },
        orderBy: { attemptedAt: 'desc' },
        take: 30,
      },
      _count: { select: { lessonCompletions: true } },
    },
  });

  if (!user) throw new Error('User not found');

  const profile = user.profile || {};

  // ── Skills ──
  const proficientSkills = user.userSkills
    .filter(s => Number(s.proficiencyPct) >= 70)
    .map(s => ({ name: s.skill.name, category: s.skill.category, pct: Number(s.proficiencyPct) }));

  const developingSkills = user.userSkills
    .filter(s => Number(s.proficiencyPct) >= 30 && Number(s.proficiencyPct) < 70)
    .map(s => ({ name: s.skill.name, category: s.skill.category, pct: Number(s.proficiencyPct) }));

  const weakSkills = user.userSkills
    .filter(s => Number(s.proficiencyPct) < 30)
    .map(s => ({ name: s.skill.name, category: s.skill.category, pct: Number(s.proficiencyPct) }));

  // ── Courses ──
  const completedCourses = user.enrolments
    .filter(e => e.status === 'completed')
    .map(e => ({ title: e.course.title, tags: e.course.tags, level: e.course.level }));

  const activeCourses = user.enrolments
    .filter(e => e.status === 'active')
    .map(e => ({ title: e.course.title, tags: e.course.tags, level: e.course.level }));

  const coveredTags = [...new Set([
    ...completedCourses.flatMap(c => c.tags),
    ...activeCourses.flatMap(c => c.tags),
  ])];

  // ── Assessment performance ──
  const attempts = user.assessmentAttempts;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + Number(a.scorePct), 0) / attempts.length)
    : null;
  const passRate = attempts.length > 0
    ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100)
    : null;

  // ── Experience level ──
  const xp     = profile.xpTotal || 0;
  const level  = profile.level   || 1;
  const expYrs = profile.experienceYears;

  return {
    name:            user.name,
    careerGoal:      profile.careerGoal || null,
    currentRole:     profile.currentRole || null,
    experienceYears: expYrs,
    industry:        profile.industry || null,
    xp,
    level,
    streakDays:      profile.streakDays || 0,
    lessonsCompleted: user._count.lessonCompletions,
    proficientSkills,
    developingSkills,
    weakSkills,
    completedCourses,
    activeCourses,
    coveredTags,
    avgAssessmentScore: avgScore,
    assessmentPassRate: passRate,
  };
}

// ── Prompt Builders ───────────────────────────────────────────────────────────

function buildTopicPrompt({ topic, level, numModules, targetAudience }) {
  return `Generate a complete online course structure for the following:

- Topic: ${topic}
- Level: ${level}
- Number of modules: ${numModules}
- Target audience: ${targetAudience || 'professionals looking to upskill'}

Return a JSON object with EXACTLY this structure:

{
  "title": "concise, compelling course title",
  "description": "2-3 sentences summarising what learners will achieve",
  "tags": ["5 to 8 relevant skill tag strings"],
  "estimatedHours": 10,
  "modules": [
    {
      "title": "Module title",
      "estimatedMins": 60,
      "lessons": [
        {
          "title": "Lesson title",
          "type": "text",
          "estimatedMins": 20,
          "xpReward": 10,
          "contentBody": "Detailed markdown lesson content with ## subheadings, bullet points, examples. At least 300 words."
        }
      ]
    }
  ],
  "questions": [
    {
      "text": "Question text?",
      "type": "mcq",
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "a",
      "explanation": "Why A is correct",
      "difficulty": "medium",
      "skillTags": ["relevant-tag"],
      "xpReward": 5
    }
  ]
}

Rules:
- Generate exactly ${numModules} modules, each with 2-4 lessons
- Generate 8-10 assessment questions total (mix of easy/medium/hard)
- contentBody must be rich markdown with real educational content
- xpReward for lessons: 10 for text, 15 for project lessons
- correctAnswer must be one of "a", "b", "c", or "d"`;
}

function buildPersonalisedPrompt(ctx, numModules) {
  const skillSummary = [
    ctx.proficientSkills.length > 0
      ? `Proficient (≥70%): ${ctx.proficientSkills.map(s => `${s.name} (${s.pct}%)`).join(', ')}`
      : null,
    ctx.developingSkills.length > 0
      ? `Developing (30–69%): ${ctx.developingSkills.map(s => `${s.name} (${s.pct}%)`).join(', ')}`
      : null,
    ctx.weakSkills.length > 0
      ? `Weak (<30%): ${ctx.weakSkills.map(s => `${s.name} (${s.pct}%)`).join(', ')}`
      : null,
  ].filter(Boolean).join('\n  ');

  const performanceSummary = ctx.avgAssessmentScore !== null
    ? `Average assessment score: ${ctx.avgAssessmentScore}%, pass rate: ${ctx.assessmentPassRate}%`
    : 'No assessments taken yet';

  const completedSummary = ctx.completedCourses.length > 0
    ? ctx.completedCourses.map(c => `"${c.title}" [${c.tags.join(', ')}]`).join(', ')
    : 'None yet';

  const activeSummary = ctx.activeCourses.length > 0
    ? ctx.activeCourses.map(c => `"${c.title}"`).join(', ')
    : 'None';

  const coveredTagsStr = ctx.coveredTags.length > 0
    ? ctx.coveredTags.join(', ')
    : 'none';

  return `You are an expert instructional designer creating a highly personalised course for a specific learner.

LEARNER PROFILE:
  Name: ${ctx.name}
  Career goal: ${ctx.careerGoal || 'Not specified — infer from skills and context'}
  Current role: ${ctx.currentRole || 'Not specified'}
  Experience: ${ctx.experienceYears != null ? `${ctx.experienceYears} year(s)` : 'Not specified'}
  Industry: ${ctx.industry || 'Not specified'}
  Platform XP: ${ctx.xp} (Level ${ctx.level})
  Lessons completed: ${ctx.lessonsCompleted}
  Learning streak: ${ctx.streakDays} days

SKILL PROFICIENCY (from assessments & completed lessons):
  ${skillSummary || 'No skill data recorded yet'}

ASSESSMENT PERFORMANCE:
  ${performanceSummary}

LEARNING HISTORY:
  Completed courses: ${completedSummary}
  Currently enrolled: ${activeSummary}
  Topics already covered: ${coveredTagsStr}

DESIGN INSTRUCTIONS:
1. Identify the most impactful skill gaps between the learner's current state and their career goal.
2. Prioritise skills that are Weak (<30%) or not yet measured.
3. Build on Developing skills (30–69%) — do not repeat content from completed courses.
4. Skip topics already well covered (≥70% proficiency or in covered tags).
5. Match depth to their experience level (${ctx.experienceYears != null ? `${ctx.experienceYears} years experience` : 'unknown experience'}, Level ${ctx.level} on platform).
6. If career goal is missing, infer from their skill profile and completed courses.
7. Number of modules: ${numModules}

Return a JSON object with EXACTLY this structure:

{
  "title": "Personalised, goal-focused course title",
  "description": "2-3 sentences naming the skill gaps this course fills and how it advances their career goal",
  "tags": ["5 to 8 skill tag strings targeting identified gaps"],
  "estimatedHours": 8,
  "targetedGaps": ["list of specific skill gaps this course addresses"],
  "modules": [
    {
      "title": "Module title",
      "estimatedMins": 60,
      "lessons": [
        {
          "title": "Lesson title",
          "type": "text",
          "estimatedMins": 20,
          "xpReward": 10,
          "contentBody": "Detailed markdown lesson content. At least 300 words."
        }
      ]
    }
  ],
  "questions": [
    {
      "text": "Question text?",
      "type": "mcq",
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "a",
      "explanation": "Why A is correct",
      "difficulty": "medium",
      "skillTags": ["relevant-tag"],
      "xpReward": 5
    }
  ]
}

Rules:
- Generate exactly ${numModules} modules, each with 2-4 lessons
- Generate 8-10 assessment questions focused on the identified gaps
- correctAnswer must be one of "a", "b", "c", or "d"
- Make content immediately applicable to the learner's career goal`;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function generateCourseFromTopic({ topic, level = 'Beginner', numModules = 3, targetAudience }) {
  const prompt = buildTopicPrompt({ topic, level, numModules, targetAudience });
  const course  = await callGroq(prompt);
  if (!course.slug) course.slug = slugify(course.title || topic);
  return course;
}

async function generateCourseForLearner(prisma, userId, numModules = 3) {
  const ctx    = await buildLearnerContext(prisma, userId);
  const prompt = buildPersonalisedPrompt(ctx, numModules);
  const course  = await callGroq(prompt);
  if (!course.slug) course.slug = slugify(course.title || ctx.careerGoal || 'personalised-course');
  return { course, learnerName: ctx.name, context: ctx };
}

/**
 * Returns the learner context without generating a course.
 * Used by the admin UI to show a profile preview before generating.
 */
async function getLearnerContext(prisma, userId) {
  return buildLearnerContext(prisma, userId);
}

module.exports = { generateCourseFromTopic, generateCourseForLearner, getLearnerContext, slugify };
