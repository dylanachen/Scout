# FreelanceOS — Frontend (Team Pylovers)

**Angela Kang — Product / web + Android.**  
DSCI 560: *Freelancer–Client AI Communication Platform* (chat, onboarding, scope guardian integration, invoices).

## Repository layout

Everything for the course frontend lives under this folder:

```
files/
├── README.md
├── web/                        ← React (Vite) — primary surface
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/
│       │   ├── client.js
│       │   └── demoAdapter.js  ← optional offline mocks
│       ├── components/
│       │   ├── ChatWindow.jsx
│       │   ├── ContractPanel.jsx
│       │   ├── MetricCard.jsx
│       │   ├── NavSidebar.jsx
│       │   ├── ScopeAlert.jsx
│       │   └── ThreadList.jsx
│       ├── hooks/
│       │   ├── useAuth.jsx     ← Auth context + JWT
│       │   └── useWebSocket.js
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Invoices.jsx
│       │   ├── Onboarding.jsx
│       │   └── ProjectChat.jsx
│       ├── styles/tokens.css
│       ├── App.jsx
│       └── main.jsx
│
└── android/                    ← React Native (Expo)
    ├── .env.example
    ├── app.json
    ├── App.tsx
    ├── api/
    │   ├── client.ts
    │   └── demoAdapter.ts
    ├── context/AuthContext.tsx ← signOut (mirrors web sidebar)
    ├── components/
    │   ├── ScopeAlert.tsx      ← native Scope Guardian card + clipboard
    │   └── SignOutHeaderButton.tsx
    └── screens/
        ├── LoginScreen.tsx     ← Shown when logged out (not Profile onboarding)
        ├── ChatScreen.tsx      ← WebSocket + scope_alert + ScopeAlert
        ├── DashboardScreen.tsx ← __DEV__ panel (expo-constants)
        └── OnboardingScreen.tsx
```

## Web setup

```bash
cd web
npm install
cp .env.example .env          # set VITE_API_URL and VITE_WS_URL
npm run dev                   # http://localhost:3000
```

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
npx expo start --android
```

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
```

Use your machine’s LAN IP instead of `10.0.2.2` when testing on a physical device.

For demo flags, `true`, `1`, or `yes` (any common casing) all count as enabled.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| **Chat send does nothing** | Without the API, set **`VITE_DEMO_MODE=true`** (web) or **`EXPO_PUBLIC_DEMO_MODE=true`** (Android), then **restart** the dev server / Expo. Demo chat does not use WebSockets. |
| **Still stuck after editing `.env`** | Vite and Expo read env at **startup** — always stop and restart `npm run dev` or `expo start`. Hard-refresh the browser. |
| **“Reconnecting” / offline in chat** | Backend WebSocket URL wrong or server down — or switch to **demo mode** for local-only chat. |
| **Sign up / login fails** | Demo mode accepts any credentials. Live mode needs **`POST /auth/register`** and **`POST /auth/login`** on the FastAPI app. |

## Backend integration (Vincent-Daniel)

| What | Endpoint / URL | Used in |
|------|----------------|---------|
| Register | `POST /auth/register` `{ email, password }` | `useAuth`, `LoginScreen` (then login) |
| Login | `POST /auth/login` | `useAuth`, `LoginScreen` |
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

## Recent fixes (Angela pass)

- **Scaffolded** `web/` and `android/` so imports match this README (no more broken flat files).
- **Web:** responsive layout (sidebar drawer + overlay on small screens), `AuthProvider` + JWT axios helper, stub pages wired to the API.
- **Android:** **login when logged out** (was incorrectly routing to Profile onboarding). Removed fake chat tab badge.
- **ScopeAlert:** **Dismiss** button calls `onDismiss`; **ChatWindow:** safe initials when `client_name` is missing; stable `id` on scope payloads.
- **Android:** native **ScopeAlert** + **`scope_alert`** handling in chat; **AuthContext** + header **Sign out**; **`__DEV__`** dev-menu sign-out and **expo-constants** debug card on dashboard (**expo-clipboard** for copy).
- **Chat:** demo sends no longer depend on WebSocket `connected` (race fix); **`projectId` cleared** resets thread state; Android send button matches web (hint when offline); **`String(id)`** thread selection when API returns numeric ids.
