# ALE Platform — Phase 2 Sprint 1

## Quick Start (Option B — Free Tier)

### Step 1: Supabase setup (10 min)
1. Go to supabase.com → New Project → free plan
2. Settings → Database → copy the **Connection string (URI mode)** → this is your `DATABASE_URL`
3. Settings → API → copy **Project URL** and **anon public key** and **service_role key**

### Step 2: Groq API key (2 min)
1. Go to console.groq.com → Create API key (free, no card)

### Step 3: Back-end
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, SUPABASE_*, GROQ_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET
# Generate secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

npm install
npx prisma db push          # Apply schema to Supabase
npm run dev                 # Starts on http://localhost:4000
```

Verify: `curl http://localhost:4000/api/v1/health`

### Step 4: Front-end
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:4000/api/v1

npm install
npm run dev                 # Starts on http://localhost:5173
```

Open http://localhost:5173 → click Register → you're in.

---

## Project Structure

```
ale-phase2/
├── backend/
│   ├── app.js                    Express app setup, all routes mounted
│   ├── server.js                 Entry point
│   ├── .env.example              All required env vars documented
│   ├── prisma/
│   │   └── schema.prisma         18-table PostgreSQL schema
│   └── src/
│       ├── middleware/
│       │   ├── auth.js           JWT verification, requireAuth, requireAdmin
│       │   ├── errorHandler.js   Global error handler (Prisma + Zod + JWT errors)
│       │   └── rateLimiter.js    Auth (10/min) + API (120/min) + Tutor (30/min)
│       ├── routes/
│       │   ├── auth.js           POST register/login/refresh/logout, GET me ✅ COMPLETE
│       │   ├── profile.js        GET/PUT profile, POST onboarding, GET dashboard/analytics ✅
│       │   ├── courses.js        GET catalogue/course, POST enrol ✅
│       │   ├── lessons.js        GET lesson, POST complete (full pipeline) ✅
│       │   ├── assessments.js    GET questions, POST submit (scoring + skill update) ✅
│       │   ├── community.js      GET/POST posts, POST react ✅
│       │   ├── tutor.js          POST chat (Groq), GET/DELETE history ✅
│       │   ├── skills.js         Stub — Sprint 2
│       │   ├── badges.js         Stub — Sprint 2
│       │   ├── path.js           Stub — Sprint 4
│       │   ├── mentors.js        Stub — Sprint 3
│       │   └── admin.js          Stub — Sprint 3
│       └── services/
│           ├── tutorService.js   Groq API call with learner context + history
│           ├── progressService.js Lesson completion pipeline (transaction)
│           ├── badgeService.js   Criteria engine (course/streak/score/xp)
│           └── skillService.js   Weighted skill proficiency update
└── frontend/
    ├── vite.config.js            Vite + React, proxy /api → backend
    └── src/
        ├── api/client.js         Axios + auto token refresh interceptor
        ├── store/authStore.js    Zustand store with localStorage persistence
        ├── App.jsx               Router — public vs protected routes
        ├── components/
        │   └── ProtectedRoute.jsx  Redirect unauthenticated users
        └── pages/
            ├── Login.jsx         Full login form + error handling
            ├── Register.jsx      Registration with validation
            └── Dashboard.jsx     Sprint 1 placeholder (Sprint 2: real UI)

```

## API Reference (Sprint 1 Live)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/register | Public | Create account |
| POST | /api/v1/auth/login | Public | Login, get tokens |
| POST | /api/v1/auth/refresh | Public | Refresh access token |
| POST | /api/v1/auth/logout | Protected | Invalidate refresh token |
| GET | /api/v1/auth/me | Protected | Current user + profile |
| GET | /api/v1/profile | Protected | Full profile + skills |
| PUT | /api/v1/profile | Protected | Update profile |
| POST | /api/v1/profile/onboarding | Protected | Save wizard answers |
| GET | /api/v1/profile/dashboard | Protected | Dashboard summary |
| GET | /api/v1/courses | Public | Course catalogue |
| POST | /api/v1/courses/:slug/enrol | Protected | Enrol in a course |
| GET | /api/v1/lessons/:id | Protected | Full lesson content |
| POST | /api/v1/lessons/:id/complete | Protected | Complete lesson (XP + streak + badge) |
| GET | /api/v1/assessments/:courseSlug | Protected | Get quiz questions |
| POST | /api/v1/assessments/:courseSlug/submit | Protected | Submit + score + skill update |
| GET | /api/v1/posts | Public | Community posts |
| POST | /api/v1/posts | Protected | Create post |
| POST | /api/v1/posts/:id/react | Protected | Like / helpful / bookmark |
| POST | /api/v1/tutor/chat | Protected | AI Tutor (Groq) |
| GET | /api/v1/tutor/history | Protected | Conversation history |

## Deploy to Free Tier (Production)

### Back-end → Render
1. Push repo to GitHub
2. render.com → New Web Service → connect repo → select `backend` folder
3. Build: `npm install && npx prisma generate`
4. Start: `node server.js`
5. Add all env vars from `.env.example`

### Front-end → Vercel
1. vercel.com → Import project → select repo → select `frontend` folder
2. Add `VITE_API_URL=https://your-render-app.onrender.com/api/v1`
3. Deploy → done

## Sprint 2 Next Steps
- Seed 3 real courses (Python, Statistics, SQL) with modules and lessons
- Connect Phase 1 prototype HTML UI pages to the API
- Email verification via Brevo SMTP
- File upload to Supabase Storage (course PDFs, avatars)
