// ALE Mentors routes — Sprint 6: Calendly booking wired.
// Replace calendarUrl values with real Calendly links per mentor.

const router = require('express').Router();
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// To add a real Calendly link: set calendarUrl to your mentor's Calendly URL,
// e.g. 'https://calendly.com/your-username/30min'
const STATIC_MENTORS = [
  {
    id: 'mentor-001',
    name: 'Priya Sharma',
    title: 'Senior Data Scientist @ Flipkart',
    bio: '8 years in ML/AI. Specialises in helping career-switchers break into data science.',
    avatarUrl: null,
    expertise: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
    rating: 4.9,
    sessionCount: 142,
    availableSlots: ['Mon 10am', 'Wed 2pm', 'Fri 11am'],
    calendarUrl: process.env.MENTOR_001_CALENDLY_URL || null,
  },
  {
    id: 'mentor-002',
    name: 'Arjun Mehta',
    title: 'Engineering Manager @ Razorpay',
    bio: '10 years in full-stack development. Coaches developers aiming for senior roles.',
    avatarUrl: null,
    expertise: ['Node.js', 'React', 'System Design', 'Leadership'],
    rating: 4.8,
    sessionCount: 98,
    availableSlots: ['Tue 3pm', 'Thu 5pm', 'Sat 10am'],
    calendarUrl: process.env.MENTOR_002_CALENDLY_URL || null,
  },
  {
    id: 'mentor-003',
    name: 'Sneha Reddy',
    title: 'Product Manager @ Swiggy',
    bio: 'Transitioned from engineering to PM. Helps technical folks navigate the PM path.',
    avatarUrl: null,
    expertise: ['Product Strategy', 'Analytics', 'Stakeholder Management', 'Agile'],
    rating: 4.7,
    sessionCount: 64,
    availableSlots: ['Mon 4pm', 'Fri 2pm'],
    calendarUrl: process.env.MENTOR_003_CALENDLY_URL || null,
  },
];

// GET /mentors — list available mentors
router.get('/', async (req, res) => {
  // Strip availability detail from listing — show in detail view only
  const mentors = STATIC_MENTORS.map(({ availableSlots, calendarUrl, ...m }) => m);
  res.json({ mentors });
});

// GET /mentors/:id — single mentor with available slots
router.get('/:id', async (req, res) => {
  const mentor = STATIC_MENTORS.find(m => m.id === req.params.id);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
  res.json({ mentor });
});

// GET /mentors/me/sessions — current user's sessions
// (Placeholder until Calendly integration in Sprint 6)
router.get('/me/sessions', requireAuth, async (req, res) => {
  res.json({ sessions: [], message: 'Live booking available in Sprint 6 (Calendly integration).' });
});

module.exports = router;
