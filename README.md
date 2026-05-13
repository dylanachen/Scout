# Scout

An end-to-end web app for freelancers and clients to run engagements: matching, real-time chat with an AI Scope Guardian, contracts with RAG-powered summarization, time tracking, milestone invoicing, and a notification center — all backed by a FastAPI service.

---

## Highlights

- **AI Scope Guardian** — live LLM analysis of the chat against the signed contract; flags scope-creep moments before they become unpaid work.
- **Contract RAG + AI summary** — upload a PDF contract; ChromaDB embeddings power Q&A in chat and per-contract structured summaries (key terms, deliverables, payment, deadlines, risks).
- **Real-time chat (WebSocket)** — owner + accepted invitees share a thread per project. Thread list sorts by latest activity with live updates.
- **Matching** — freelancer ⇄ client matching pulled from embedded profiles.
- **Time / tasks / invoices / change orders** — full project ops stack.
- **Notifications** — unified bell that combines unread chat messages and the system notification feed.
- **Theming + i18n** — light / dark theme, three locales, density toggle.

---

## Tech stack

| Layer | What we use |
|-------|-------------|
| Web   | React 18, Vite, React Router, i18next, axios |
| Backend | FastAPI, SQLite (WAL), `python-jose` JWT, bcrypt, `pdfplumber` |
| AI / RAG | OpenAI (`gpt-4o-mini`), ChromaDB (`PersistentClient`) |
| Real-time | FastAPI WebSocket |

---

## Project layout

```
.
├── src/                  # React (Vite) web client
├── index.html            # Vite entry
├── vite.config.js        # dev server proxy & build config
├── package.json
├── public/               # static assets
├── backend/
│   ├── main.py           # FastAPI app, routes, WebSocket, AI endpoints
│   ├── database.py       # SQLite schema + idempotent migrations
│   ├── auth.py           # JWT, bcrypt password hashing
│   ├── seed_demo.py      # demonstration seed (wipes DB, populates accounts/projects/chats)
│   ├── requirements.txt
│   ├── uploads/          # contract PDFs, chat attachments (runtime)
│   ├── chroma_db/        # ChromaDB persistence (runtime)
│   └── freelanceos.db    # SQLite file (runtime)
└── README.md
```

---

## Quick start

Prerequisites:

- **Node.js 18+** and npm
- **Python 3.10+** (3.13 verified)
- An **OpenAI API key** if you want the AI features (Scope Guardian, Contract Summary, Chat AI Summary / Ask AI). The app degrades gracefully without one.

### 1. Frontend

```bash
touch .env        # at repo root
nano  .env
```

Paste:

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Set to true to use the app with no backend (mock API + local chat).
VITE_DEMO_MODE=false

# Enables AI features in the FastAPI backend (Scope Guardian, Contract Summary,
# Chat AI Summary / Ask AI). The Python process reads this same .env.
OPENAI_API_KEY=sk-...your-key-here
```

Run:

```bash
npm install
npm run dev          # http://localhost:3000
```

**Demo mode (no backend):** flip `VITE_DEMO_MODE=true`, restart Vite, and use the *Explore signed-in UI* button on the splash screen. Useful for design work without the API running.

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional backend-only env vars: `SECRET_KEY` (JWT), `DB_PATH`, `UPLOAD_DIR`. `OPENAI_API_KEY` is read from the root `.env` automatically.

The first run auto-creates `backend/freelanceos.db` and seeds a default `demo@freelanceos.local` freelancer plus a small matching pool. Skip ahead to **Demo seed** if you want a clean, richer dataset.

---

## Demo seed

`backend/seed_demo.py` wipes the SQLite file, recreates the schema, and inserts four `daniel*@gmail.com` accounts, a few side clients, seven projects, ~100 realistic chat messages, tasks, invoices, time entries and notifications. Useful for screenshots, demonstrations, and resetting after experimenting.

```bash
cd backend
python seed_demo.py
```

Seeded login accounts (password `dbswndud123` for all):

| Email | Role | Visible projects |
|---|---|---|
| `daniel@gmail.com`  | client     | Owns 3 projects, invites the three freelancers respectively |
| `daniel2@gmail.com` | freelancer | 3 projects (Brand redesign / SaaS onboarding / Checkout overhaul) |
| `daniel3@gmail.com` | freelancer | 3 projects (Marketing site v2 / Checkout overhaul / Internal tools) |
| `daniel4@gmail.com` | freelancer | 2 projects (Mobile MVP / Symptom tracker) |
| `mira@summit.example`, `ben@harborline.example`, `evan@lumoshealth.example`, `aria@drift.example` | client | Side clients so freelancers see a varied thread list |

The seeded chat transcripts include a scope-creep moment (Summit Analytics asks for admin-panel work) so Scope Guardian has something to react to once you wire `OPENAI_API_KEY`.

---

## Main routes

**Auth** &nbsp;`/login` · `/signup` · `/forgot-password`

**Core** &nbsp;`/` · `/projects` · `/projects/new` · `/pipeline` · `/matches` · `/interests` · `/invitations` · `/notifications` · `/chat` · `/invoices` · `/settings`

**Project tools** &nbsp;`/projects/:projectId/tasks` · `…/contract` · `…/change-order` · `…/invoice-draft` · `…/scope-drift` · `…/meeting-summary` · `…/rate-client` · `…/milestones`

---

## Development notes

- The Vite client and FastAPI server share the project-root `.env` (Vite via `import.meta.env.VITE_*`, FastAPI via `python-dotenv`). `OPENAI_API_KEY` is read by the Python process; it never reaches the browser.
- SQLite uses WAL journaling so concurrent reads work. Schema drift is handled by `_run_migrations()` in `backend/database.py` (idempotent `ALTER TABLE … ADD COLUMN`).
- ChromaDB persists under `backend/chroma_db/`; deleting that folder forces a re-embed on the next contract upload.
- Uploads (contract PDFs, chat attachments) live under `backend/uploads/`.
- AI prompts are co-located with the endpoint that uses them (`main.py`) and degrade to non-LLM fallbacks when the OpenAI call fails or `OPENAI_API_KEY` is unset.

---

## License

Internal course project — not for redistribution.
