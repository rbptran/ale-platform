// ALE AI Service — Multi-provider AI with round-robin rotation and automatic fallback.
// Supported providers (enable by setting the corresponding env var):
//   GEMINI_API_KEY     → Google Gemini 2.0 Flash (best free tier: 1M tokens/day, 1500 req/day)
//   GROQ_API_KEY       → Groq: llama-3.3-70b-versatile (12k TPM), llama-3.1-8b-instant (6k TPM)
//   OPENROUTER_API_KEY → OpenRouter free models (gemma-2-9b, qwen-2.5-7b)

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

const SYSTEM_PROMPT = 'You are an expert instructional designer. You always respond with valid JSON only — no markdown, no explanations, no extra text.';

function parseJSON(text, providerName) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error(`${providerName} response was not valid JSON`);
  }
}

// ── Provider Implementations ──────────────────────────────────────────────────

// maxTokens is per-provider — Groq free tier has tight TPM limits (6k–12k total per request)
// Gemini 2.0 Flash free tier: 1M tokens/day, no per-request cap → use 32k
// OpenRouter free models: varies, 16k is safe

async function callGroqModel(prompt, model, maxTokens) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Groq (${model}) returned no content`);
  return parseJSON(text, `Groq/${model}`);
}

// Gemini model names as of 2025–2026:
//   gemini-2.0-flash        (GA, free, recommended)
//   gemini-2.0-flash-lite   (faster, lower quality)
//   gemini-1.5-flash-8b     (older, still available)
async function callGemini(prompt, model, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error?.message || `Gemini HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini (${model}) returned no content`);
  return parseJSON(text, `Gemini/${model}`);
}

async function callOpenRouter(prompt, model, maxTokens) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://ale-platform.vercel.app',
      'X-Title': 'ALE Platform',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error?.message || `OpenRouter HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenRouter (${model}) returned no content`);
  return parseJSON(text, `OpenRouter/${model}`);
}

// ── Provider Registry & Rotation ─────────────────────────────────────────────
// Order matters: best providers first. Each is skipped if its env var isn't set.
// maxTokens is tuned to each provider's free-tier limit.

const PROVIDERS = [
  // ① Gemini 2.0 Flash — best free tier (1M tokens/day), no per-request size limit
  {
    name: 'gemini/2.0-flash',
    available: () => !!process.env.GEMINI_API_KEY,
    maxTokens: 32000,
    call: (p, t) => callGemini(p, 'gemini-2.0-flash', t),
  },
  // ② Groq Llama 3.3 70B — high quality, free TPM limit: 12k total tokens/request
  {
    name: 'groq/llama-3.3-70b',
    available: () => !!process.env.GROQ_API_KEY,
    maxTokens: 8000,   // prompt ~2-3k tokens + 8k output = stays under 12k TPM
    call: (p, t) => callGroqModel(p, 'llama-3.3-70b-versatile', t),
  },
  // ③ OpenRouter Gemma 2 9B (free) — good JSON output
  {
    name: 'openrouter/gemma-2-9b',
    available: () => !!process.env.OPENROUTER_API_KEY,
    maxTokens: 16000,
    call: (p, t) => callOpenRouter(p, 'google/gemma-2-9b-it:free', t),
  },
  // ④ OpenRouter Qwen 2.5 7B (free) — strong at structured output
  {
    name: 'openrouter/qwen-2.5-7b',
    available: () => !!process.env.OPENROUTER_API_KEY,
    maxTokens: 16000,
    call: (p, t) => callOpenRouter(p, 'qwen/qwen-2.5-7b-instruct:free', t),
  },
  // ⑤ Gemini Flash Lite — fallback if 2.0-flash is rate limited
  {
    name: 'gemini/2.0-flash-lite',
    available: () => !!process.env.GEMINI_API_KEY,
    maxTokens: 32000,
    call: (p, t) => callGemini(p, 'gemini-2.0-flash-lite', t),
  },
  // ⑥ Groq Llama 3.1 8B — smallest/fastest, TPM limit: 6k total tokens/request
  {
    name: 'groq/llama-3.1-8b',
    available: () => !!process.env.GROQ_API_KEY,
    maxTokens: 3500,   // prompt ~2k + 3.5k output = under 6k TPM
    call: (p, t) => callGroqModel(p, 'llama-3.1-8b-instant', t),
  },
];

// Round-robin index — persists for the lifetime of the Node process
let _providerIdx = 0;

async function callAI(prompt) {
  const active = PROVIDERS.filter((p) => p.available());
  if (active.length === 0) {
    throw new Error('No AI providers configured. Set at least one of: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY');
  }

  const start = _providerIdx % active.length;
  let lastErr;

  for (let i = 0; i < active.length; i++) {
    const provider = active[(start + i) % active.length];
    try {
      const result = await provider.call(prompt, provider.maxTokens);
      _providerIdx = (start + i + 1) % active.length; // next call starts from the next provider
      console.log(`[AI] ✓ ${provider.name} (max ${provider.maxTokens} tokens)`);
      return result;
    } catch (err) {
      const isRateLimit = err.status === 429 || /rate.?limit|429|quota/i.test(err.message || '');
      console.warn(`[AI] ✗ ${provider.name}: ${err.message}${isRateLimit ? ' (rate limited)' : ''}`);
      lastErr = err;
      // Always try the next provider on any failure
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastErr?.message}`);
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
  return `Generate a complete, rich online course structure for the following:

- Topic: ${topic}
- Level: ${level}
- Number of modules: ${numModules}
- Target audience: ${targetAudience || 'professionals looking to upskill'}

Return a JSON object with EXACTLY this structure:

{
  "title": "concise, compelling course title",
  "description": "2-3 sentences summarising what learners will achieve",
  "tags": ["5 to 8 relevant skill tag strings"],
  "estimatedHours": 12,
  "modules": [
    {
      "title": "Module title",
      "estimatedMins": 90,
      "lessons": [
        {
          "title": "Lesson title",
          "type": "text",
          "estimatedMins": 30,
          "xpReward": 10,
          "contentBody": "Rich markdown lesson content. Must include: ## Overview section (2-3 paragraphs), ## Key Concepts with detailed explanations, ## Step-by-Step Walkthrough with numbered steps, ## Real-World Example with concrete scenario, ## Common Mistakes to Avoid, ## Summary. Minimum 700 words total."
        },
        {
          "title": "Hands-On Exercise: [topic]",
          "type": "project",
          "estimatedMins": 45,
          "xpReward": 25,
          "contentBody": "## Exercise Overview\n[What learners will build/do]\n\n## Prerequisites\n[What to have ready]\n\n## Step-by-Step Instructions\n[Numbered steps, each with explanation]\n\n## Expected Outcome\n[What success looks like]\n\n## Bonus Challenge\n[Extension task for advanced learners]\n\n## Video Reference\nSearch YouTube for: '[specific search query to find a relevant tutorial video for this exercise]'"
        },
        {
          "title": "Video: [specific concept]",
          "type": "video",
          "estimatedMins": 15,
          "xpReward": 10,
          "videoUrl": "",
          "contentBody": "## What You Will Learn\n[Learning outcomes]\n\n## Recommended Video\nSearch YouTube for: '[specific search query — e.g. \"React useState hook explained 2024\"]'\n\nPaste the YouTube embed URL above once you find a suitable video.\n\n## Key Takeaways\n[3-5 bullet points summarising what to watch for]"
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
- Generate exactly ${numModules} modules, each with 3-5 lessons
- Mix lesson types: mostly "text" (deep dives), at least one "project" (hands-on exercise) per module, and one "video" per module
- For "video" lessons: set videoUrl to "" and include a specific YouTube search query in contentBody so the admin knows what to look for
- For "project" lessons: include a YouTube search query at the end for a reference tutorial video
- contentBody for "text" lessons must be rich markdown, minimum 700 words, with subheadings and examples
- Generate 10-12 assessment questions total (3 easy, 5 medium, 4 hard)
- xpReward: text=10, video=10, project=25, simulation=20
- correctAnswer must be one of "a", "b", "c", or "d"
- estimatedHours should reflect total content realistically (text: 30 mins, video: 15 mins, project: 45 mins each)`;
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
  "estimatedHours": 10,
  "targetedGaps": ["list of specific skill gaps this course addresses"],
  "modules": [
    {
      "title": "Module title",
      "estimatedMins": 90,
      "lessons": [
        {
          "title": "Lesson title",
          "type": "text",
          "estimatedMins": 30,
          "xpReward": 10,
          "contentBody": "Rich markdown lesson. Must include: ## Overview (why this matters for their career goal), ## Core Concepts with detailed explanations tailored to their experience level, ## Practical Application with worked examples from their industry, ## Step-by-Step Guide, ## Common Pitfalls, ## Summary. Minimum 700 words."
        },
        {
          "title": "Applied Exercise: [skill name]",
          "type": "project",
          "estimatedMins": 45,
          "xpReward": 25,
          "contentBody": "## Exercise Overview\n[What the learner will do — tied directly to their career goal]\n\n## Instructions\n[Numbered steps]\n\n## Success Criteria\n[How they know they've done it correctly]\n\n## Bonus Challenge\n[Stretch task for advancing learners]\n\n## Video Reference\nSearch YouTube for: '[specific search query for a tutorial video relevant to this exercise]'"
        },
        {
          "title": "Video: [specific concept]",
          "type": "video",
          "estimatedMins": 15,
          "xpReward": 10,
          "videoUrl": "",
          "contentBody": "## What You Will Learn\n[Learning outcomes relevant to their career goal]\n\n## Recommended Video\nSearch YouTube for: '[specific search query]'\n\nPaste the YouTube embed URL above once you find a suitable video.\n\n## Watch For\n[3-5 specific things to pay attention to]"
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
- Generate exactly ${numModules} modules, each with 3-5 lessons
- Mix lesson types: mostly "text" (deep dives), at least one "project" per module, and one "video" per module
- For "video" lessons: set videoUrl to "" and include a specific YouTube search query in contentBody
- For "project" lessons: include a YouTube search query at the end of contentBody for reference
- contentBody for "text" lessons must be minimum 700 words with ## subheadings
- Generate 10-12 assessment questions focused on the identified gaps (3 easy, 5 medium, 4 hard)
- correctAnswer must be one of "a", "b", "c", or "d"
- Content must be immediately applicable to the learner's career goal: ${ctx.careerGoal || 'professional advancement'}
- xpReward: text=10, video=10, project=25`;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function generateCourseFromTopic({ topic, level = 'Beginner', numModules = 3, targetAudience }) {
  const prompt = buildTopicPrompt({ topic, level, numModules, targetAudience });
  const course  = await callAI(prompt);
  if (!course.slug) course.slug = slugify(course.title || topic);
  return course;
}

async function generateCourseForLearner(prisma, userId, numModules = 3) {
  const ctx    = await buildLearnerContext(prisma, userId);
  const prompt = buildPersonalisedPrompt(ctx, numModules);
  const course  = await callAI(prompt);
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

// ── Learner Interview Extraction ──────────────────────────────────────────────

/**
 * Analyse a learner's 3-question conversational interview and extract
 * structured profile data: skills, gaps, motivation signals, focus areas.
 * Returns a JSON object suitable for storing in aiExtractedData.
 */
async function extractLearnerInsights(answers) {
  // answers = [{ question, answer }, { question, answer }, { question, answer }]
  const transcript = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
    .join('\n\n');

  const prompt = `You are analysing a learner intake interview for an adaptive learning platform focused on adult professional development.

The learner answered 3 open-ended questions. Extract structured insights from their responses.

INTERVIEW TRANSCRIPT:
${transcript}

Return a JSON object with EXACTLY this structure:
{
  "extractedSkills": ["list of skills the learner already has, mentioned or implied"],
  "identifiedGaps": ["specific skill gaps or weaknesses the learner mentioned or implied"],
  "motivationSignals": ["key phrases or themes that reveal what drives this learner"],
  "urgencyLevel": 3,
  "barriers": ["obstacles the learner faces: time, confidence, resources, etc."],
  "recommendedFocusAreas": ["3-5 specific learning focus areas most relevant to this learner"],
  "learnerPersona": "one of: driven_achiever | career_changer | knowledge_seeker | compliance_learner | reluctant_learner",
  "summary": "2-3 sentences capturing this learner's situation, key motivation, and primary learning need"
}

Rules:
- urgencyLevel: 1 (no rush) to 5 (very urgent, deadline-driven)
- extractedSkills: include both hard skills and soft skills
- identifiedGaps: be specific — not just 'leadership' but 'giving constructive feedback to direct reports'
- recommendedFocusAreas: actionable and tied to their stated goal
- summary: write in second person (e.g. "You are a mid-level manager...")
- If the learner gave short/vague answers, infer reasonably from context`;

  // Use a faster provider for this extraction — it's smaller than full course generation
  const result = await callAI(prompt);
  return result;
}

/**
 * Compute a learner readiness score (0–100) from their completed profile.
 * Higher = more ready to engage with self-directed adaptive learning.
 */
function computeReadinessScore(profile, aiData) {
  let score = 0;

  // Motivation (0–30): urgency + motivation type
  const urgency = aiData?.urgencyLevel || 1;
  score += Math.min(urgency * 5, 20); // up to 20 pts
  const motivationBonus = {
    career_transition: 10, employer_requirement: 10,
    promotion: 8, certification: 8,
    personal_enrichment: 5, academic: 5,
  };
  score += motivationBonus[profile.motivationType] || 4;

  // Time availability (0–25)
  const hrs = profile.weeklyHoursAvailable || 0;
  if (hrs >= 10) score += 25;
  else if (hrs >= 5) score += 18;
  else if (hrs >= 2) score += 10;
  else score += 3;

  // Goal clarity (0–25)
  if (profile.sixMonthGoal?.trim().length > 20) score += 15;
  else if (profile.sixMonthGoal?.trim().length > 5) score += 8;
  if (profile.careerGoal?.trim()) score += 10;

  // Profile completeness (0–20)
  const fields = [
    profile.currentRole, profile.industry, profile.experienceYears,
    profile.educationLevel, profile.employmentStatus,
    profile.goalType, profile.learningStyles?.length,
  ];
  const filled = fields.filter(Boolean).length;
  score += Math.round((filled / fields.length) * 20);

  return Math.min(Math.round(score), 100);
}

module.exports = {
  generateCourseFromTopic, generateCourseForLearner, getLearnerContext,
  extractLearnerInsights, computeReadinessScore,
  slugify,
};
