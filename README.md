# Scout — unified app (API + web + mobile)

This folder is the **single place** for the course stack:

| Path | What it is |
|------|------------|
| `src/`, `index.html`, `vite.config.js`, `package.json` | React (Vite) web client — same feature set as the former `frontend/web` tree, plus FastAPI integrations (WebSockets, uploads, `/notifications`, time entries, tasks, etc.). |
| `backend/` | FastAPI + SQLite + WebSocket + RAG (ChromaDB). Run from here with `uvicorn`. |
| `android/` | Expo / React Native client (copied from `frontend/android`; point it at the same API). |

If you still maintain a separate `frontend/web` or `frontend/android` copy for your fork, treat **`backend/` as the source of truth** for shipping: merge UI changes from `frontend` into `backend/src` (and this `android/` folder), and **keep** backend-only code in files such as `App.jsx`, `ChatWindow.jsx`, `api/demoAdapter.js`, `hooks/useNotifications.jsx`, `hooks/useTimeTracking.jsx`, and `hooks/useUnreadMessages.jsx` — those extend the base UI with live API behavior.

# Web/Mobile Frontend Part Reproducing

```bash
touch .env # create .env
nano .env # modifying .env
```

Write down below setups (Example .env)
```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Set to true to use the app with no backend (mock API + local chat).
VITE_DEMO_MODE=false
OPENAI_API_KEY = Enter you api key
```

Running commands
```bash
npm install            # this README’s directory
cp .env.example .env   # set VITE_API_URL and VITE_WS_URL
npm run dev            # http://localhost:3000
```

**Demo mode (no API):** set `VITE_DEMO_MODE=true`, restart Vite, then use mock login / **Explore signed-in UI**.

<br><br>
# Web/Mobile Backend Reproducing

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional `backend/backend/.env` (see `requirements.txt` / code): `SECRET_KEY`, `OPENAI_API_KEY`, `DB_PATH`, `UPLOAD_DIR`.

## Main web routes (reference)

Auth: `/login`, `/signup`, `/forgot-password`. Core: `/`, `/projects`, `/projects/new`, `/pipeline`, `/matches`, `/interests`, `/invitations`, `/notifications`, `/chat`, `/invoices`, `/settings`, … Project tools: `/projects/:projectId/tasks`, `…/contract`, `…/change-order`, `…/invoice-draft`, `…/scope-drift`, `…/meeting-summary`, `…/rate-client`, `…/milestones`.


