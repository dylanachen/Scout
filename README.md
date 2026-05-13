# Scout — unified app (API + web + mobile)

This folder is the **single place** for the course stack:

| Path | What it is |
|------|------------|
| `src/`, `index.html`, `vite.config.js`, `package.json` | React (Vite) web client. FastAPI integrations: WebSocket chat, uploads, `/notifications`, time entries, tasks, invoices, scope guardian, contract RAG. |
| `backend/` | FastAPI + SQLite + WebSocket + RAG (ChromaDB). Run from `backend/` with `uvicorn`. |
| `android/` | Expo / React Native client. Point at the same API. |

If you still maintain a separate `frontend/web` or `frontend/android` copy for your fork, treat **this repo as the source of truth** for shipping: merge UI changes into `src/` (and `android/`), and **keep** the FastAPI-aware code such as `App.jsx`, `ChatWindow.jsx`, `api/demoAdapter.js`, `hooks/useNotifications.jsx`, `hooks/useTimeTracking.jsx`, `hooks/useUnreadMessages.jsx` — those extend the base UI with live API behavior.

---

## Web / mobile frontend

```bash
touch .env       # create .env at this repo's root
nano  .env       # paste the block below
```

`.env` example:

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Set to true to use the app with no backend (mock API + local chat).
VITE_DEMO_MODE=false
```

Run:

```bash
npm install
npm run dev      # http://localhost:3000
```

**Demo mode (no API):** set `VITE_DEMO_MODE=true`, restart Vite, then use the mock login / *Explore signed-in UI* button. Useful for the design loop when the backend isn't running.

**Mobile preview while developing:** the left sidebar has a `Preview as mobile` button (DEV-only) that opens the current page inside a phone-shaped iframe with a faux status bar and notch. Lets you check mobile layouts without a device.

---

## FastAPI backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional `backend/.env`: `SECRET_KEY`, `OPENAI_API_KEY` (enables Contract Summary, Scope Guardian, Chat AI Summary / Assist), `DB_PATH`, `UPLOAD_DIR`.

The first run auto-creates `backend/freelanceos.db` and seeds a default `demo@freelanceos.local` freelancer + a small pool of demo clients (Jordan / Sam / Riley) so the matching pages have something to show. Sign up your own accounts from the web app to start clean.

---

## Android (Expo)

```bash
cd android
npm install
cp .env.example .env
npm start
```

Use **Expo Go** on a device on the same LAN, or `npx expo start --android` for an emulator. Set `EXPO_PUBLIC_API_URL` to your machine's LAN IP on port `8000` (Android emulator: `http://10.0.2.2:8000`). For demo-only mobile UI: `EXPO_PUBLIC_DEMO_MODE=true` in `android/.env`.

---

## Main web routes (reference)

Auth: `/login`, `/signup`, `/forgot-password`.
Core: `/`, `/projects`, `/projects/new`, `/pipeline`, `/matches`, `/interests`, `/invitations`, `/notifications`, `/chat`, `/invoices`, `/settings`.
Project tools: `/projects/:projectId/tasks`, `…/contract`, `…/change-order`, `…/invoice-draft`, `…/scope-drift`, `…/meeting-summary`, `…/rate-client`, `…/milestones`.
