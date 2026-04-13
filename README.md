# Scout — Frontend (Team Pylovers)

**Angela Kang — Product / web + Android.**  
DSCI 560: *Freelancer–Client AI Communication Platform* (chat, onboarding, scope guardian integration, invoices, matching, time tracking).

## Repository layout

Course frontend code lives in this folder (`files/` in your checkout; in the `dsci 560` repo it is under `proj/files/`).

```
files/
├── README.md
├── .gitignore                                   ← ignores node_modules, dist, .env, …
├── web/                                         ← React (Vite) — primary surface
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/              REST client (`client.js`) + offline mocks (`demoAdapter.js`)
│       ├── components/       App shell, chat, portfolio, time tracking, notifications, …
│       ├── pages/              Routed screens; `settings/` for account & prefs
│       ├── hooks/              Auth, WebSocket, notifications, time tracking, dashboard data, …
│       ├── data/               Demo seeds (matches, notifications, onboarding flows, …)
│       ├── utils/              LocalStorage helpers, formatting, demo storage
│       ├── styles/tokens.css
│       ├── App.jsx             Route table + signed-in layout
│       └── main.jsx
└── android/                                     ← React Native (Expo)
    ├── .env.example
    ├── app.json
    ├── App.tsx                 Navigation + auth gating
    ├── api/                    `client.ts`, `demoAdapter.ts`
    ├── context/                `AuthContext.tsx`
    ├── components/             `ScopeAlert`, `SignOutHeaderButton`, …
    └── screens/
        ├── LoginScreen.tsx
        ├── SignUpScreen.tsx
        ├── ForgotPasswordScreen.tsx
        ├── OnboardingScreen.tsx
        ├── DashboardScreen.tsx
        ├── ChatScreen.tsx
        └── AccountSettingsScreen.tsx
```

After `git clone`, run `npm install` inside `web/` and `android/` separately. **Do not commit** `node_modules/`, build output (`web/dist/`), or real `.env` files.

**Ignore rules:** the `dsci 560` repo root has a `.gitignore` (Node env files, `dist/`, etc.). This folder adds `proj/files/.gitignore` for Vite/Expo paths (`web/.vite/`, `android/.expo/`, …). Together they keep secrets and dependencies out of Git.

## Web — main routes

| Area | Paths (examples) |
|------|-------------------|
| Auth | `/login`, `/signup`, `/forgot-password` |
| Core app | `/` (dashboard), `/projects`, `/pipeline`, `/matches`, `/matches/confirm`, `/notifications`, `/chat`, `/onboarding`, `/invoices` |
| Onboarding & matching | `/onboarding/freelancer`, `/onboarding/client`, `/onboarding/client/assets`, `/onboarding/matching` |
| Settings | `/settings`, `/settings/notifications`, `/settings/scope-guardian`, `/settings/rates-pricing`, `/settings/communication`, `/settings/account`, `/settings/profile` |
| Project tools | `/projects/:projectId/contract`, `…/change-order`, `…/invoice-draft`, `…/scope-drift`, `…/meeting-summary`, `…/rate-client` |
| Other | `/time/week`, `/public/freelancer/:userId` |

**Note:** `/pipeline` and `/chat` are valid routes but are not primary sidebar items (pipeline is reached from product flows; chat is often opened from a project). The mobile bottom bar covers a subset of routes; use the URL bar or in-app links for the rest.

## Web setup

```bash
cd web
npm install
cp .env.example .env          # set VITE_API_URL and VITE_WS_URL
npm run dev                   # http://localhost:3000 (see vite.config.js)
```

**Scripts:** `npm run dev` (Vite dev server), `npm run build` (production bundle to `web/dist/`), `npm run preview` (serve the built app).

### See the signed-in UI without the backend (demo mode)

1. In `web/.env` add: **`VITE_DEMO_MODE=true`**
2. Restart `npm run dev`
3. On the login screen click **Explore signed-in UI** (or sign in with **any** email/password — the mock accepts them).

You get dashboard metrics, project list, chat with seeded messages (local only), onboarding replies, invoices, and contract upload success — all without FastAPI. The top bar shows a **Demo mode** pill.

**Android:** set **`EXPO_PUBLIC_DEMO_MODE=true`** in `android/.env`, restart Expo, then use **Explore signed-in UI** on the login screen.

## Android setup

```bash
cd android
npm install
cp .env.example .env          # optional; defaults suit Android emulator → host
npx expo start --android      # or: npm run android
```

**Scripts:** `npm start` runs `expo start`; `npm run android` runs `expo start --android`.

**Navigation (this codebase):** when signed out — stack: Login, SignUp, ForgotPassword. When signed in — bottom tabs: **Dashboard** (Home), **Chat**, **Onboarding** (tab label “Profile”); **Account settings** opens as an additional stack screen (`AccountSettingsScreen`).

## Environment variables

### `web/.env`

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=true
```

Omit `VITE_DEMO_MODE` (or set to `false`) when using the real API.

### `android/.env` (Expo)

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:8000
# EXPO_PUBLIC_DEMO_MODE=true
```

(`EXPO_PUBLIC_DEMO_MODE` is optional; same semantics as `VITE_DEMO_MODE` on web — see `android/api/demoAdapter.ts`.)

Use your machine’s LAN IP instead of `10.0.2.2` when testing on a physical device.

For demo flags, `true`, `1`, or `yes` (any common casing) all count as enabled.

## Backend integration

| What | Endpoint / URL | Used in |
|------|----------------|---------|
| Register | `POST /auth/register` `{ email, password }` | `useAuth`, `SignUp.jsx`, `SignUpScreen` |
| Login | `POST /auth/login` | `useAuth`, `Login.jsx`, `LoginScreen` |
| Session | `GET /auth/me` | `useAuth`, `App.tsx` |
| Projects | `GET /projects` | Dashboard, `ProjectChat`, `ChatScreen` |
| Chat WS | `WS /ws/chat/:projectId?token=…` | `useWebSocket`, `ChatScreen` |
| History / message / scope | frames `history`, `message`, `scope_alert` | hooks + `ChatWindow` |
| Contract PDF | `POST /projects/:id/contract` | `ContractPanel` |
| Invoices | `GET /invoices`, `PATCH /invoices/:id` | `Invoices` page |
| Onboarding | `POST /onboarding/message` | `Onboarding.jsx`, `OnboardingScreen.tsx` |

## Scope alert payload (private to freelancer)

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

`useWebSocket` forwards `payload` into `ScopeAlert` on web; **`ChatScreen`** does the same on Android (`components/ScopeAlert.tsx`, **expo-clipboard** for “Copy suggested reply”).

**Sign out (Android):** every tab header has **Sign out** (same as web sidebar). In **`__DEV__`**, the React Native dev menu also lists **FreelanceOS: Sign out** (`DevSettings.addMenuItem`). The dashboard shows **expo-constants** (slug, version) and resolved API URL in dev only.

