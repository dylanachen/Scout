# Scout — Frontend

Web and mobile clients for **Scout**, a freelancer–client collaboration platform (chat, onboarding, scope awareness, invoicing, matching, and time tracking).

## Layout

From the repository root (the directory that contains `frontend/` and `backend/`):

- `frontend/web` — React (Vite)
- `frontend/android` — React Native (Expo)

Install dependencies in each app directory separately. Do not commit `node_modules/`, build artifacts, or real `.env` files.

## Web — main routes

| Area | Paths (examples) |
|------|-------------------|
| Auth | `/login`, `/signup`, `/forgot-password` |
| Core app | `/` (dashboard), `/projects`, `/pipeline`, `/matches`, `/matches/confirm`, `/notifications`, `/chat`, `/onboarding`, `/invoices` |
| Onboarding & matching | `/onboarding/freelancer`, `/onboarding/client`, `/onboarding/client/assets`, `/onboarding/matching` |
| Settings | `/settings`, `/settings/notifications`, `/settings/scope-guardian`, `/settings/rates-pricing`, `/settings/communication`, `/settings/account`, `/settings/profile` |
| Project tools | `/projects/:projectId/contract`, `…/change-order`, `…/invoice-draft`, `…/scope-drift`, `…/meeting-summary`, `…/rate-client` |
| Other | `/time/week`, `/public/freelancer/:userId` |

`/pipeline` and `/chat` are valid routes but are not primary sidebar entries. The mobile tab bar covers a subset of routes; use in-app navigation or direct URLs for the rest.

## Web setup

```bash
cd frontend/web
npm install
cp .env.example .env
npm run dev
```

Default dev URL is in `vite.config.js` (typically `http://localhost:3000`).

**Scripts:** `npm run dev`, `npm run build` (output in `web/dist/`), `npm run preview`.

### Demo mode (no backend)

1. In `frontend/web/.env`, set `VITE_DEMO_MODE=true`.
2. Restart the dev server.
3. On the login screen, use **Explore signed-in UI**, or sign in with any email and password (the mock accepts them).

You get seeded dashboard data, projects, local-only chat, onboarding, invoices, and contract upload simulation. The UI shows a **Demo mode** indicator.

**Android:** set `EXPO_PUBLIC_DEMO_MODE=true` in `frontend/android/.env`, restart Expo, then use **Explore signed-in UI**.

## Android setup

### Option A (recommended): Expo Go on a device

```bash
cd frontend/android
npm install
cp .env.example .env
npm start
```

1. Install **Expo Go** on your Android device.
2. Connect the device and your computer to the same network.
3. Scan the QR code shown in the terminal.
4. If LAN connection fails, try:

   ```bash
   npx expo start --tunnel
   ```

### Option B: Android emulator

Requires Android Studio, the Android SDK, and `adb` on your `PATH`.

```bash
cd frontend/android
npm install
cp .env.example .env
npx expo start --android
```

**Scripts:** `npm start` runs `expo start`; `npm run android` runs `expo start --android`.

**Navigation:** When signed out: Login, Sign up, Forgot password. When signed in: bottom tabs for Dashboard (Home), Chat, and Onboarding (labeled “Profile”); account settings open as an additional screen.

## Environment variables

### `frontend/web/.env`

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=true
```

Set `VITE_DEMO_MODE` to `false` or omit it when using the live API.

### `frontend/android/.env`

**Android emulator** (host machine is reachable as `10.0.2.2`):

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:8000
# EXPO_PUBLIC_DEMO_MODE=true
```

`EXPO_PUBLIC_DEMO_MODE` mirrors web demo behavior; see `android/api/demoAdapter.ts`.

**Physical device with Expo Go** — use your development machine’s LAN IP instead of `10.0.2.2`:

```
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:8000
EXPO_PUBLIC_WS_URL=ws://<YOUR_LAN_IP>:8000
EXPO_PUBLIC_DEMO_MODE=false
```

Restart Expo after changing `.env`.

For demo flags, `true`, `1`, and `yes` (any common casing) are treated as enabled.

## API integration (reference)

| Feature | Endpoint / URL | Used in |
|--------|----------------|---------|
| Register | `POST /auth/register` `{ email, password }` | Auth hooks, sign-up screens |
| Login | `POST /auth/login` | Auth hooks, login screens |
| Session | `GET /auth/me` | Auth hooks, `App.tsx` (Android) |
| Projects | `GET /projects` | Dashboard, chat |
| Chat | `WS /ws/chat/:projectId?token=…` | WebSocket hooks, `ChatScreen` |
| Frames | `history`, `message`, `scope_alert` | Chat UI |
| Contract PDF | `POST /projects/:id/contract` | Contract panel |
| Invoices | `GET /invoices`, `PATCH /invoices/:id` | Invoices UI |
| Onboarding | `POST /onboarding/message` | Onboarding screens |

## Scope alert payload (freelancer-only)

```json
{
  "type": "scope_alert",
  "payload": {
    "id": "alert_abc123",
    "message": "Client requested social templates — not in SOW.",
    "suggested_reply": "That sounds great! This falls outside our current scope...",
    "contract_clause": "Section 2.1 — Deliverables",
    "after_message_id": "msg_xyz456"
  }
}
```

Web and Android forward this payload into the scope alert component (Android uses **expo-clipboard** for “Copy suggested reply”).

**Android sign-out:** Available from tab headers; in `__DEV__`, the React Native dev menu may include **Scout: Sign out**. In development, the dashboard can show app metadata and the resolved API URL.
