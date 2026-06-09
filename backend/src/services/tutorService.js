// ALE AI Tutor Service — Option B: Groq (free) / Option A: Anthropic Claude
const Groq   = require('groq-sdk');
const prisma = require('../lib/prisma');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function chat(userId, message, contextCourseId = null) {
  // 1. Load learner context
  const [user, profile, skills] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.learnerProfile.findUnique({ where: { userId }, select: {
      careerGoal: true, xpTotal: true, streakDays: true, level: true,
    }}),
    prisma.userSkill.findMany({ where: { userId }, include: { skill: { select: { name: true } } },
      orderBy: { proficiencyPct: 'desc' }, take: 5 }),
  ]);

  let courseContext = '';
  if (contextCourseId) {
    const enrolment = await prisma.enrolment.findFirst({
      where: { userId, courseId: contextCourseId },
      include: { course: { select: { title: true } } },
    });
    if (enrolment) {
      courseContext = `\n- Current course: ${enrolment.course.title} (${enrolment.progressPct}% complete)`;
    }
  }

  const topSkills = skills.slice(0, 3).map(s => `${s.skill.name} (${s.proficiencyPct}%)`).join(', ');

  // 2. Build system prompt with learner context
  const systemPrompt = `You are ARIA, an expert AI tutor for the ALE learning platform.

LEARNER CONTEXT:
- Name: ${user.name}
- Career goal: ${profile?.careerGoal || 'Not set yet'}
- Level: ${profile?.level || 1} (${profile?.xpTotal || 0} XP total)
- Current streak: ${profile?.streakDays || 0} days${courseContext}
- Top skills: ${topSkills || 'None assessed yet'}

INSTRUCTIONS:
- Respond in a warm, encouraging, expert tone.
- Use examples relevant to the learner's career goal (${profile?.careerGoal || 'general'}).
- Keep responses concise but thorough (under 200 words unless a detailed explanation is needed).
- If asked to generate a quiz, produce exactly 3 multiple-choice questions with 4 options each.
- If asked to explain a concept, build from first principles and use an analogy.
- Never make up facts — say "I'm not sure, let me suggest you check..." if uncertain.`;

  // 3. Load conversation history (last 10 messages for context)
  const history = await prisma.tutorMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const historyMessages = history.reverse().map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  // 4. Call Groq API (Option B — free)
  // To switch to Claude (Option A): replace with Anthropic SDK call
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

  // 5. Persist both messages
  await prisma.tutorMessage.createMany({
    data: [
      { userId, role: 'user',      content: message,  courseId: contextCourseId },
      { userId, role: 'assistant', content: response, courseId: contextCourseId },
    ],
  });

  // 6. Activity event
  await prisma.activityEvent.create({
    data: { userId, eventType: 'tutor_chat', metadata: { messageLength: message.length } },
  });

  return response;
}

module.exports = { chat };
