/** Fixed demo logins; enables mock API without VITE_DEMO_MODE when used from the client. */
export const DEMO_CREDENTIALS_PASSWORD = 'test';
/** Freelancer demo: username `freelancer`, password `test` */
export const DEMO_FREELANCER_USER = 'freelancer';
/** Client demo: username `client`, password `test` */
export const DEMO_CLIENT_USER = 'client';
export const DEMO_TOKEN = 'freelanceos-demo-token';
const DEMO_SESSION_KEY = 'fos_demo_session';

const FREELANCER_PROFILE = {
  id: 1,
  email: 'freelancer.demo@freelanceos.local',
  name: 'Angela Kang',
  role: 'freelancer',
  avatar_url: null,
};

const CLIENT_PROFILE = {
  id: 2,
  email: 'client.demo@freelanceos.local',
  name: 'Jordan Lee',
  role: 'client',
  avatar_url: null,
};

/** In-memory invoices so “Mark paid” works during demo. */
let demoInvoices = [
  { id: 'inv-1', amount: '$2,400', status: 'sent' },
  { id: 'inv-2', amount: '$800', status: 'paid' },
];

/** Mutable demo user for profile / auth flows. */
let demoUser = { ...FREELANCER_PROFILE };

function parsePath(config) {
  let raw = config.url || '';
  if (raw.startsWith('http')) {
    try {
      raw = new URL(raw).pathname;
    } catch {
      /* keep raw */
    }
  }
  return raw.split('?')[0];
}

function parseBody(config) {
  const d = config.data;
  if (d == null) return {};
  if (typeof d === 'string') {
    try {
      return JSON.parse(d);
    } catch {
      return {};
    }
  }
  return d;
}

function resolveDemo(config) {
  const method = (config.method || 'get').toUpperCase();
  const path = parsePath(config);

  if (method === 'POST' && path === '/auth/login') {
    const body = parseBody(config);
    const emailRaw = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const lower = emailRaw.toLowerCase();
    if (password === DEMO_CREDENTIALS_PASSWORD && lower === DEMO_FREELANCER_USER) {
      demoUser = { ...FREELANCER_PROFILE };
      return { status: 200, data: { access_token: DEMO_TOKEN } };
    }
    if (password === DEMO_CREDENTIALS_PASSWORD && lower === DEMO_CLIENT_USER) {
      demoUser = { ...CLIENT_PROFILE };
      return { status: 200, data: { access_token: DEMO_TOKEN } };
    }
    if (emailRaw) demoUser = { ...demoUser, email: emailRaw };
    return { status: 200, data: { access_token: DEMO_TOKEN } };
  }
  if (method === 'POST' && path === '/auth/register') {
    const body = parseBody(config);
    const email = String(body.email ?? '').trim();
    const fullName = String(body.full_name ?? body.name ?? '').trim();
    const role = body.role === 'client' ? 'client' : 'freelancer';
    demoUser = {
      ...demoUser,
      email: email || demoUser.email,
      name: fullName || demoUser.name,
      role,
    };
    return { status: 201, data: { ok: true } };
  }
  if (method === 'GET' && path === '/auth/me') {
    return { status: 200, data: { ...demoUser } };
  }
  if (method === 'PATCH' && path === '/auth/me') {
    const body = parseBody(config);
    demoUser = {
      ...demoUser,
      ...(body.name != null ? { name: String(body.name) } : {}),
      ...(body.email != null ? { email: String(body.email) } : {}),
      ...(body.avatar_url != null ? { avatar_url: body.avatar_url } : {}),
      ...(body.role != null
        ? { role: body.role === 'client' ? 'client' : 'freelancer' }
        : {}),
    };
    return { status: 200, data: { ...demoUser } };
  }
  if (method === 'POST' && path === '/auth/forgot-password') {
    const body = parseBody(config);
    const email = String(body.email ?? '').trim().toLowerCase();
    if (email === 'notfound@freelanceos.local') {
      return { status: 404, data: { detail: 'No account found for this email.' } };
    }
    return { status: 200, data: { ok: true } };
  }
  if (method === 'POST' && path === '/auth/change-password') {
    return { status: 200, data: { ok: true } };
  }
  if (method === 'DELETE' && path === '/auth/me') {
    return { status: 200, data: { ok: true } };
  }
  if (method === 'GET' && path === '/dashboard/summary') {
    const windowStart = '2026-04-01';
    const windowEnd = '2026-05-15';
    return {
      status: 200,
      data: {
        stats: {
          active_projects: 3,
          hours_logged_week: 28.5,
          pending_invoices_count: 2,
          pending_invoices_total_cents: 320000,
          unread_messages: 7,
        },
        projects: [
          {
            id: 'demo-p1',
            name: 'Website refresh',
            client_id: 'northwind-llc',
            client_name: 'Northwind LLC',
            freelancer_id: 1,
            freelancer_name: 'Angela Kang',
            status: 'in_progress',
            milestone_index: 2,
            milestone_total: 5,
            next_deadline: '2026-04-14T17:00:00.000Z',
            unread_count: 2,
          },
          {
            id: 'demo-p2',
            name: 'Pitch deck',
            client_id: 'blue-harbor',
            client_name: 'Blue Harbor',
            freelancer_id: 1,
            freelancer_name: 'Angela Kang',
            status: 'awaiting_approval',
            milestone_index: 3,
            milestone_total: 4,
            next_deadline: '2026-04-22T12:00:00.000Z',
            unread_count: 0,
          },
          {
            id: 'demo-p3',
            name: 'Analytics dashboard',
            client_id: 'summit-co',
            client_name: 'Summit Co.',
            freelancer_id: 1,
            freelancer_name: 'Angela Kang',
            status: 'overdue',
            milestone_index: 1,
            milestone_total: 6,
            next_deadline: '2026-04-06T09:00:00.000Z',
            unread_count: 5,
          },
        ],
        pending_matches: [
          {
            id: 'pm-1',
            title: 'Brand system + landing',
            counterpart_name: 'Jordan Lee',
            counterpart_role: 'client',
            budget: '$8k–12k',
          },
          {
            id: 'pm-2',
            title: 'Mobile app MVP',
            counterpart_name: 'Morgan Park',
            counterpart_role: 'client',
            budget: '$15k',
          },
        ],
        notifications: [
          { id: 'n1', text: 'Northwind LLC approved milestone 2 deliverable.', at: '2026-04-08T09:12:00.000Z' },
          { id: 'n2', text: 'Invoice #1042 is due in 3 days.', at: '2026-04-07T16:40:00.000Z' },
          { id: 'n3', text: 'New message in Website refresh.', at: '2026-04-07T11:05:00.000Z' },
          { id: 'n4', text: 'Match request expires in 24 hours.', at: '2026-04-06T08:00:00.000Z' },
        ],
        pipeline: {
          window_start: windowStart,
          window_end: windowEnd,
          revenue_forecast: { from_active_projects_cents: 4200000, from_pending_invoices_cents: 320000 },
          bars: [
            {
              project_id: 'demo-p1',
              name: 'Website refresh',
              start: '2026-04-02',
              end: '2026-04-14',
            },
            {
              project_id: 'demo-p2',
              name: 'Pitch deck',
              start: '2026-04-05',
              end: '2026-04-22',
            },
            {
              project_id: 'demo-p3',
              name: 'Analytics dashboard',
              start: '2026-03-18',
              end: '2026-04-06',
            },
          ],
          upcoming_deadlines: [
            { project_id: 'demo-p3', name: 'Analytics dashboard', date: '2026-04-06' },
            { project_id: 'demo-p1', name: 'Website refresh', date: '2026-04-14' },
            { project_id: 'demo-p2', name: 'Pitch deck', date: '2026-04-22' },
          ],
        },
      },
    };
  }
  if (method === 'GET' && path === '/projects') {
    return {
      status: 200,
      data: [
        {
          id: 'demo-p1',
          name: 'Website refresh',
          client_id: 'northwind-llc',
          client_name: 'Northwind LLC',
          freelancer_id: 1,
          freelancer_name: 'Angela Kang',
          status: 'in_progress',
          milestone_index: 2,
          milestone_total: 5,
          next_deadline: '2026-04-14T17:00:00.000Z',
          unread_count: 2,
        },
        {
          id: 'demo-p2',
          name: 'Pitch deck',
          client_id: 'blue-harbor',
          client_name: 'Blue Harbor',
          freelancer_id: 1,
          freelancer_name: 'Angela Kang',
          status: 'awaiting_approval',
          milestone_index: 3,
          milestone_total: 4,
          next_deadline: '2026-04-22T12:00:00.000Z',
          unread_count: 0,
        },
        {
          id: 'demo-p3',
          name: 'Analytics dashboard',
          client_id: 'summit-co',
          client_name: 'Summit Co.',
          freelancer_id: 1,
          freelancer_name: 'Angela Kang',
          status: 'overdue',
          milestone_index: 1,
          milestone_total: 6,
          next_deadline: '2026-04-06T09:00:00.000Z',
          unread_count: 5,
        },
      ],
    };
  }
  if (method === 'GET' && path === '/invoices') {
    return { status: 200, data: demoInvoices.map((x) => ({ ...x })) };
  }
  if (method === 'PATCH' && /^\/invoices\/.+/.test(path)) {
    const id = path.replace('/invoices/', '');
    const body = parseBody(config);
    demoInvoices = demoInvoices.map((inv) =>
      inv.id === id ? { ...inv, ...body } : inv,
    );
    return { status: 200, data: { ok: true } };
  }
  if (method === 'POST' && path === '/onboarding/message') {
    const { message } = parseBody(config);
    return {
      status: 200,
      data: {
        reply: `(Demo — no backend.) You’d get a real LLM reply here. You said: “${message ?? ''}”`,
      },
    };
  }
  if (method === 'POST' && /^\/projects\/.+\/contract$/.test(path)) {
    return { status: 200, data: { ok: true } };
  }

  return {
    status: 404,
    data: { detail: `Demo mode: no mock for ${method} ${path}` },
  };
}

export function demoAdapter(config) {
  const { status, data } = resolveDemo(config);
  return Promise.resolve({
    data,
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  });
}

function envDemoModeEnabled() {
  const v = String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** True when mock API should run: env flag, or fixed test/test session, or legacy demo token in storage. */
export function shouldUseDemoAdapter() {
  if (envDemoModeEnabled()) return true;
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(DEMO_SESSION_KEY) === '1') return true;
  if (localStorage.getItem('fos_token') === DEMO_TOKEN) return true;
  return false;
}

/** UI label “Demo mode” — same conditions as mock API, plus after login when session is demo. */
export function isDemoMode() {
  return shouldUseDemoAdapter();
}

export { DEMO_SESSION_KEY };
