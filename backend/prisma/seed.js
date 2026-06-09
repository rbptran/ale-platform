// ALE Platform — Prisma Seed  (v2 — JSON-driven)
// Run:  npm run db:seed   or   node prisma/seed.js
//
// Course data lives in prisma/courses/*.json — one file per course.
// This file only handles: admin user, skill definitions, badge definitions,
// then loops through the JSON files to seed courses.
//
// To export existing DB courses to JSON (one-time setup):
//   node prisma/exportCourses.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

const prisma      = new PrismaClient();
const COURSES_DIR = path.join(__dirname, 'courses');

// ── helpers ───────────────────────────────────────────────────────────────────

async function upsertModule(courseId, order, title, estimatedMins = 60, isFreePreview = false) {
  const existing = await prisma.module.findFirst({ where: { courseId, displayOrder: order } });
  if (existing) return existing;
  return prisma.module.create({
    data: { courseId, title, displayOrder: order, estimatedMins, isFreePreview },
  });
}

async function upsertLesson(moduleId, order, title, type, estimatedMins, xpReward, contentBody) {
  const existing = await prisma.lesson.findFirst({ where: { moduleId, displayOrder: order } });
  if (existing) return existing;
  return prisma.lesson.create({
    data: { moduleId, title, type, displayOrder: order, estimatedMins, xpReward, contentBody },
  });
}

async function seedCourse(data, adminId, courseSlugToId) {
  const prerequisiteCourseIds = (data.prerequisiteSlugs || [])
    .map(slug => courseSlugToId[slug])
    .filter(Boolean);

  const course = await prisma.course.upsert({
    where:  { slug: data.slug },
    update: {
      title: data.title, description: data.description,
      level: data.level, estimatedHours: data.estimatedHours,
      tags: data.tags, displayOrder: data.displayOrder,
      prerequisiteCourseIds,
    },
    create: {
      slug: data.slug, title: data.title, description: data.description,
      level: data.level, estimatedHours: data.estimatedHours,
      status: 'published', tags: data.tags,
      displayOrder: data.displayOrder, createdBy: adminId,
      publishedAt: new Date(), prerequisiteCourseIds,
    },
  });

  for (const mod of (data.modules || [])) {
    const dbMod = await upsertModule(
      course.id, mod.order, mod.title,
      mod.estimatedMins, mod.isFreePreview || false
    );
    for (const les of (mod.lessons || [])) {
      await upsertLesson(
        dbMod.id, les.order, les.title, les.type || 'text',
        les.estimatedMins, les.xpReward, les.content || ''
      );
    }
  }

  for (const q of (data.questions || [])) {
    const exists = await prisma.question.findFirst({ where: { courseId: course.id, text: q.text } });
    if (exists) continue;
    const options = (q.options || []).map((text, i) => ({
      id: String.fromCharCode(97 + i), text,
    }));
    await prisma.question.create({
      data: {
        courseId: course.id,
        text: q.text, type: 'mcq',
        options,
        correctAnswer: [q.correctAnswer],
        explanation: q.explanation || '',
        difficulty: 'medium',
        skillTags: q.skillTag ? [q.skillTag] : [],
        xpReward: q.xpReward || 5,
      },
    });
  }

  const lessonCount = await prisma.lesson.count({ where: { module: { courseId: course.id } } });
  const qCount      = await prisma.question.count({ where: { courseId: course.id } });
  console.log(`✅ ${data.title} — ${data.modules?.length || 0} modules, ${lessonCount} lessons, ${qCount} questions`);
  return course;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ALE Platform...\n');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2024', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@ale.com' },
    update: {},
    create: {
      name: 'ALE Admin', email: 'admin@ale.com',
      passwordHash: adminHash, role: 'admin', isVerified: true,
    },
  });
  await prisma.learnerProfile.upsert({
    where:  { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  console.log('✅ Admin: admin@ale.com / Admin@2024');

  // ── Skill definitions ───────────────────────────────────────────────────────
  const skillDefs = [
    { name: 'Python',             category: 'technical',    icon: '🐍', description: 'Python programming for data science and automation' },
    { name: 'SQL',                category: 'technical',    icon: '🗄️', description: 'Structured Query Language for relational databases' },
    { name: 'Statistics',         category: 'technical',    icon: '📐', description: 'Statistical methods and probability theory' },
    { name: 'Machine Learning',   category: 'technical',    icon: '🤖', description: 'ML algorithms and model building' },
    { name: 'Data Visualization', category: 'technical',    icon: '📊', description: 'Charts, dashboards, and visual storytelling' },
    { name: 'Pandas',             category: 'technical',    icon: '🐼', description: 'Data manipulation with the Pandas library' },
    { name: 'Database Design',    category: 'technical',    icon: '🏗️', description: 'Schema design, normalisation, and indexing' },
    { name: 'Data Analysis',      category: 'technical',    icon: '🔍', description: 'Exploratory data analysis and insight generation' },
    { name: 'Problem Solving',    category: 'professional', icon: '💡', description: 'Structured problem decomposition and solution design' },
    { name: 'Communication',      category: 'professional', icon: '💬', description: 'Clear written and verbal communication of findings' },
  ];
  for (const s of skillDefs) {
    await prisma.skillDefinition.upsert({ where: { name: s.name }, update: {}, create: s });
  }
  console.log(`✅ ${skillDefs.length} skill definitions`);

  // ── Badge definitions (non-course badges) ───────────────────────────────────
  const badgeDefs = [
    { name: 'First Steps',   icon: '👣', description: 'Completed your very first lesson',      criteriaType: 'xp_threshold', criteriaValue: { xp: 10 } },
    { name: 'Week Warrior',  icon: '🔥', description: 'Maintained a 7-day learning streak',    criteriaType: 'streak',       criteriaValue: { days: 7 } },
    { name: 'Month Master',  icon: '📅', description: 'Maintained a 30-day learning streak',   criteriaType: 'streak',       criteriaValue: { days: 30 } },
    { name: 'High Scorer',   icon: '🏆', description: 'Scored 90% or above on any assessment', criteriaType: 'score',        criteriaValue: { minScore: 90 } },
    { name: 'XP Milestone',  icon: '⚡', description: 'Earned 500 XP',                        criteriaType: 'xp_threshold', criteriaValue: { xp: 500 } },
    { name: 'XP Legend',     icon: '💎', description: 'Earned 2000 XP',                       criteriaType: 'xp_threshold', criteriaValue: { xp: 2000 } },
    { name: 'Quiz Champion', icon: '📝', description: 'Scored 100% on any quiz',              criteriaType: 'score',        criteriaValue: { minScore: 100 } },
  ];
  for (const b of badgeDefs) {
    await prisma.badge.upsert({ where: { name: b.name }, update: {}, create: b });
  }
  console.log(`✅ ${badgeDefs.length} badge definitions`);

  // ── Load courses from JSON files ────────────────────────────────────────────
  if (!fs.existsSync(COURSES_DIR)) {
    console.warn('\n⚠️  prisma/courses/ not found.');
    console.warn('   Run:  node prisma/exportCourses.js   to generate JSON files from the DB.');
    console.warn('   Or drop JSON files into prisma/courses/ manually.\n');
  } else {
    const files = fs.readdirSync(COURSES_DIR)
      .filter(f => f.endsWith('.json'))
      .sort(); // 01-slug.json, 02-slug.json ... controls order

    if (files.length === 0) {
      console.warn('⚠️  prisma/courses/ is empty — no courses seeded.');
    } else {
      // Pass 1: upsert course rows to get IDs (needed to resolve prerequisites)
      const courseSlugToId = {};
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(COURSES_DIR, file), 'utf8'));
        const c = await prisma.course.upsert({
          where:  { slug: data.slug },
          update: {},
          create: {
            slug: data.slug, title: data.title, description: data.description,
            level: data.level, estimatedHours: data.estimatedHours,
            status: 'published', tags: data.tags,
            displayOrder: data.displayOrder, createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
        courseSlugToId[data.slug] = c.id;
      }

      // Pass 2: modules, lessons, questions, prerequisites, badges
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(COURSES_DIR, file), 'utf8'));
        await seedCourse(data, admin.id, courseSlugToId);

        // Auto-create a course-completion badge for every course
        const badgeName = `${data.title} Graduate`;
        await prisma.badge.upsert({
          where:  { name: badgeName },
          update: {},
          create: {
            name: badgeName, icon: '🎓',
            description: `Completed ${data.title}`,
            criteriaType: 'course_complete',
            criteriaValue: { courseSlug: data.slug },
          },
        });
      }
      console.log(`\n✅ ${files.length} course(s) seeded from prisma/courses/`);
    }
  }

  console.log('\n🎉 Seed complete! Admin: admin@ale.com / Admin@2024\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
