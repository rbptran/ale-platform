// prisma/exportCourses.js
// Exports every published course from the database into individual JSON files
// under prisma/courses/. Safe to run multiple times — overwrites existing files.
//
// Usage:  node prisma/exportCourses.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs   = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const OUT_DIR = path.join(__dirname, 'courses');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const courses = await prisma.course.findMany({
    where:   { status: 'published' },
    orderBy: { displayOrder: 'asc' },
    include: {
      modules: {
        orderBy: { displayOrder: 'asc' },
        include: {
          lessons: { orderBy: { displayOrder: 'asc' } },
        },
      },
      questions: true,
    },
  });

  // Resolve prerequisite slugs from IDs
  const allCourses = await prisma.course.findMany({ select: { id: true, slug: true } });
  const idToSlug   = Object.fromEntries(allCourses.map(c => [c.id, c.slug]));

  for (const course of courses) {
    const json = {
      slug:             course.slug,
      title:            course.title,
      description:      course.description,
      level:            course.level,
      estimatedHours:   course.estimatedHours,
      tags:             course.tags,
      displayOrder:     course.displayOrder,
      prerequisiteSlugs: (course.prerequisiteCourseIds || []).map(id => idToSlug[id]).filter(Boolean),
      modules: course.modules.map(mod => ({
        order:         mod.displayOrder,
        title:         mod.title,
        estimatedMins: mod.estimatedMins,
        isFreePreview: mod.isFreePreview,
        lessons: mod.lessons.map(les => ({
          order:         les.displayOrder,
          title:         les.title,
          type:          les.type,
          estimatedMins: les.estimatedMins,
          xpReward:      les.xpReward,
          content:       les.contentBody || '',
        })),
      })),
      questions: course.questions.map(q => ({
        text:          q.text,
        options:       (q.options || []).map(o => o.text),
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        explanation:   q.explanation || '',
        skillTag:      (q.skillTags || [])[0] || '',
        xpReward:      q.xpReward || 5,
      })),
    };

    const filename = `${String(course.displayOrder).padStart(2, '0')}-${course.slug}.json`;
    fs.writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(json, null, 2));
    console.log(`✅ Exported: ${filename}`);
  }

  console.log(`\n📁 ${courses.length} course(s) written to prisma/courses/`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
