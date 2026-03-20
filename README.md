# 🎯 SakshamAI – Multilingual AI Interviewer & Resume Analyzer

A full-stack, production-ready platform that simulates real interviews, evaluates candidates using Hugging Face NLP, analyzes resumes, enforces AI proctoring, and provides admin analytics — with multilingual support.

---

## 🚀 Local Development (Quick Start)

### Prerequisites
- Node.js 18+
- Chrome browser (for camera + speech APIs)

### 1. Server
```bash
cd server
npm install
cp .env.example .env       # fill in your values
node seed-admin.js         # creates admin@sakshamai.com / Admin@123
npm run dev                # starts on http://localhost:5000
```

### 2. Client
```bash
cd client
npm install
npm start                  # starts on http://localhost:3000
```

> The `"proxy"` in `client/package.json` auto-forwards `/api` calls to port 5000 in development.

---

## 🔑 Environment Variables

### server/.env (copy from server/.env.example)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Default 5000 |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Long random secret for tokens |
| `HUGGINGFACE_API_KEY` | Yes | HF Inference API key |
| `ALLOWED_ORIGINS` | Prod only | Comma-separated frontend URLs |

### client/.env (production only)

| Variable | When needed | Description |
|---|---|---|
| `REACT_APP_API_URL` | Production | Full deployed API URL, e.g. `https://sakshamai-api.onrender.com` |

---

## 🌐 Deploying to Production

### Option A — Render.com (recommended)

1. Push to GitHub (`.env` is gitignored)
2. Render → New → Blueprint → connect repo
3. Render reads `render.yaml` automatically
4. Set env vars in Render dashboard:
   - **API service:** `MONGODB_URI`, `HUGGINGFACE_API_KEY`, `ALLOWED_ORIGINS`
   - **Client service:** `REACT_APP_API_URL` (your API's Render URL)

### Option B — Railway (API) + Vercel (Client)

**API on Railway:**
```bash
npm i -g @railway/cli && railway login
cd server && railway init && railway up
# Set env vars in Railway dashboard
```

**Client on Vercel:**
```bash
cd client
vercel --env REACT_APP_API_URL=https://your-api.railway.app
```

### Option C — VPS with Nginx + PM2

```bash
# Server
pm2 start index.js --name sakshamai-api

# Client — build and serve static files
cd client && npm run build
# nginx root → client/build/, with try_files for SPA routing
# proxy /api → localhost:5000
```

---

## 👤 Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@sakshamai.com | Admin@123 | After running seed-admin.js |
| Student | Register at /register | — | — |
| Admin via UI | — | — | Use key: `SAKSHAM_ADMIN_2024` |

---

## 📁 Project Structure

```
sakshamai/
├── .gitignore
├── render.yaml
├── README.md
├── server/
│   ├── .env.example
│   ├── Procfile
│   ├── index.js
│   ├── seed-admin.js
│   ├── middleware/auth.js
│   ├── models/           User, Interview, Resume
│   ├── routes/           auth, interview, resume, admin
│   ├── services/huggingface.js
│   └── utils/questions.json
└── client/
    ├── .env.example
    ├── vercel.json
    └── src/
        ├── App.js
        ├── context/AuthContext.js
        ├── utils/api.js
        ├── components/shared/Sidebar.js
        └── pages/
            ├── LandingPage, Login, Register
            ├── StudentDashboard, InterviewPage
            ├── InterviewResult, ResumePage, HistoryPage
            └── AdminDashboard, AdminStudents, AdminStudentReport
```

---

## 🔌 API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/interview/questions/:role` | JWT | Questions by role |
| POST | `/api/interview/start` | JWT | Start session |
| POST | `/api/interview/submit` | JWT | Submit + AI evaluate |
| POST | `/api/interview/proctoring` | JWT | Log violation |
| GET | `/api/interview/history` | JWT | Past interviews |
| GET | `/api/interview/:id` | JWT | Full result |
| POST | `/api/resume/analyze` | JWT | Upload + analyze |
| GET | `/api/resume/history` | JWT | Past analyses |
| GET | `/api/admin/stats` | Admin | Platform analytics |
| GET | `/api/admin/students` | Admin | All students |
| GET | `/api/admin/students/:id/report` | Admin | Student report |

---

## 🤖 AI (Hugging Face)

| Task | Model |
|---|---|
| Answer relevance | `facebook/bart-large-mnli` (zero-shot) |
| Resume quality | `distilbert-base-uncased-finetuned-sst-2-english` |
| Fallback | Keyword + length heuristics |

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in production | Add frontend URL to `ALLOWED_ORIGINS` server env var |
| Camera not starting | Chrome required; grant camera permission |
| Voice input not working | Chrome only; grant microphone permission |
| HF slow first response | Models cold-start (~30s); retry logic handles it |
| Resume upload fails | `uploads/` auto-created on server start |
| MongoDB connection error | Whitelist server IP in Atlas → Network Access |
| 401 on all routes after redeploy | Old JWT tokens invalid if JWT_SECRET changed |
