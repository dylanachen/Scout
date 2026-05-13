# Scout — unified app (API + web + mobile)

This folder is the **single place** for the course stack:

| Path | What it is |
|------|------------|
| `src/`, `index.html`, `vite.config.js`, `package.json` | React (Vite) web client — same feature set as the former `frontend/web` tree, plus FastAPI integrations (WebSockets, uploads, `/notifications`, time entries, tasks, etc.). |
| `backend/` | FastAPI + SQLite + WebSocket + RAG (ChromaDB). Run from here with `uvicorn`. |
| `android/` | Expo / React Native client (copied from `frontend/android`; point it at the same API). |

If you still maintain a separate `frontend/web` or `frontend/android` copy for your fork, treat **`backend/` as the source of truth** for shipping: merge UI changes from `frontend` into `backend/src` (and this `android/` folder), and **keep** backend-only code in files such as `App.jsx`, `ChatWindow.jsx`, `api/demoAdapter.js`, `hooks/useNotifications.jsx`, `hooks/useTimeTracking.jsx`, and `hooks/useUnreadMessages.jsx` — those extend the base UI with live API behavior.

## Web (Vite)

```bash
cd backend   # this README’s directory
npm install
cp .env.example .env   # set VITE_API_URL and VITE_WS_URL
npm run dev            # http://localhost:3000
```

Example `.env`:

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=false
```

**Demo mode (no API):** set `VITE_DEMO_MODE=true`, restart Vite, then use mock login / **Explore signed-in UI**.

## FastAPI

```bash
cd backend/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional `backend/backend/.env` (see `requirements.txt` / code): `SECRET_KEY`, `OPENAI_API_KEY`, `DB_PATH`, `UPLOAD_DIR`.

## Android (Expo)

```bash
cd backend/android
npm install
cp .env.example .env
npm start
```

Use **Expo Go** on a device (same LAN) or `npx expo start --android` for an emulator. Set `EXPO_PUBLIC_API_URL` to your machine’s LAN IP and port `8000` (emulators often use `http://10.0.2.2:8000`). For demo-only mobile UI, use `EXPO_PUBLIC_DEMO_MODE=true` in `android/.env`.

## Main web routes (reference)

Auth: `/login`, `/signup`, `/forgot-password`. Core: `/`, `/projects`, `/projects/new`, `/pipeline`, `/matches`, `/interests`, `/invitations`, `/notifications`, `/chat`, `/invoices`, `/settings`, … Project tools: `/projects/:projectId/tasks`, `…/contract`, `…/change-order`, `…/invoice-draft`, `…/scope-drift`, `…/meeting-summary`, `…/rate-client`, `…/milestones`.

## Optional: refresh Android from `frontend/android`

If you still edit the Expo app under `frontend/android`, copy those changes into this repo from the monorepo root:

```bash
./backend/scripts/sync-android-from-frontend.sh
```

For **web** UI, edit `backend/src` directly (it already includes everything in `frontend/web` plus API wiring). Copy individual files from `frontend/web/src` when you need to port work, then re-check the files listed in the table at the top so FastAPI-specific behavior is not lost.
