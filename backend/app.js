const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const compression = require('compression');

const { authLimiter, apiLimiter } = require('./src/middleware/rateLimiter');
const errorHandler = require('./src/middleware/errorHandler');

// ── Route imports ──────────────────────────────────────────────────────────
const authRoutes        = require('./src/routes/auth');
const profileRoutes     = require('./src/routes/profile');
const courseRoutes      = require('./src/routes/courses');
const lessonRoutes      = require('./src/routes/lessons');
const assessmentRoutes  = require('./src/routes/assessments');
const skillRoutes       = require('./src/routes/skills');
const badgeRoutes       = require('./src/routes/badges');
const pathRoutes        = require('./src/routes/path');
const tutorRoutes       = require('./src/routes/tutor');
const communityRoutes   = require('./src/routes/community');
const mentorRoutes      = require('./src/routes/mentors');
const leaderboardRoutes = require('./src/routes/leaderboard');
const adminRoutes       = require('./src/routes/admin');

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check (no auth) ─────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authLimiter, authRoutes);
app.use('/api/v1/profile',     apiLimiter,  profileRoutes);
app.use('/api/v1/courses',     apiLimiter,  courseRoutes);
app.use('/api/v1/lessons',     apiLimiter,  lessonRoutes);
app.use('/api/v1/assessments', apiLimiter,  assessmentRoutes);
app.use('/api/v1/skills',      apiLimiter,  skillRoutes);
app.use('/api/v1/badges',      apiLimiter,  badgeRoutes);
app.use('/api/v1/path',        apiLimiter,  pathRoutes);
app.use('/api/v1/tutor',       apiLimiter,  tutorRoutes);
app.use('/api/v1/posts',       apiLimiter,  communityRoutes);
app.use('/api/v1/mentors',      apiLimiter,  mentorRoutes);
app.use('/api/v1/leaderboard',  apiLimiter,  leaderboardRoutes);
app.use('/api/v1/admin',        apiLimiter,  adminRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
