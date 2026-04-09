import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InternalAxiosRequestConfig } from 'axios';

export const DEMO_TOKEN = 'freelanceos-demo-token';
export const DEMO_SESSION_KEY = 'fos_demo_session';
export const DEMO_CREDENTIALS_PASSWORD = 'test';
export const DEMO_FREELANCER_USER = 'freelancer';
export const DEMO_CLIENT_USER = 'client';

const FREELANCER_PROFILE = {
  id: 1,
  email: 'freelancer.demo@freelanceos.local',
  name: 'Angela Kang',
  role: 'freelancer' as const,
  avatar_url: null as string | null,
};

const CLIENT_PROFILE = {
  id: 2,
  email: 'client.demo@freelanceos.local',
  name: 'Jordan Lee',
  role: 'client' as const,
  avatar_url: null as string | null,
};

type DemoUser = {
  id: number;
  email: string;
  name: string;
  role: 'freelancer' | 'client';
  avatar_url: string | null;
};

let demoUser: DemoUser = { ...FREELANCER_PROFILE };

let demoInvoices = [
  { id: 'inv-1', amount: '$2,400', status: 'sent' as const },
  { id: 'inv-2', amount: '$800', status: 'paid' as const },
];

function parsePath(config: InternalAxiosRequestConfig) {
  let raw = config.url || '';
  if (raw.startsWith('http')) {
    try {
      raw = new URL(raw).pathname;
    } catch {
      /* keep */
    }
  }
  return raw.split('?')[0];
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const d = config.data;
  if (d == null) return {};
  if (typeof d === 'string') {
    try {
      return JSON.parse(d) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof d === 'object') return d as Record<string, unknown>;
  return {};
}

function resolveDemo(config: InternalAxiosRequestConfig) {
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
    const fullName = String((body.full_name as string) ?? (body.name as string) ?? '').trim();
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
      ...(body.avatar_url != null ? { avatar_url: body.avatar_url as string | null } : {}),
      ...(body.role != null ? { role: body.role === 'client' ? 'client' : 'freelancer' } : {}),
    };
    return { status: 200, data: { ...demoUser } };
  }
  if (method === 'POST' && path === '/auth/forgot-password') {
    const body = parseBody(config);
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
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
  if (method === 'GET' && path === '/projects') {
    return {
      status: 200,
      data: [
        { id: 'demo-p1', name: 'Website refresh', client_name: 'Northwind LLC' },
        { id: 'demo-p2', name: 'Pitch deck', client_name: 'Blue Harbor' },
      ],
    };
  }
  if (method === 'GET' && path === '/invoices') {
    return { status: 200, data: demoInvoices.map((x) => ({ ...x })) };
  }
  if (method === 'PATCH' && /^\/invoices\/.+/.test(path)) {
    const id = path.replace('/invoices/', '');
    const body = parseBody(config);
    demoInvoices = demoInvoices.map((inv) => (inv.id === id ? { ...inv, ...body } : inv));
    return { status: 200, data: { ok: true } };
  }
  if (method === 'POST' && path === '/onboarding/message') {
    const message = String(parseBody(config).message ?? '');
    return {
      status: 200,
      data: {
        reply: `(Demo — no backend.) You’d get a real LLM reply here. You said: “${message}”`,
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

export function demoAdapter(config: InternalAxiosRequestConfig) {
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

export function isDemoMode() {
  const v = String(process.env.EXPO_PUBLIC_DEMO_MODE ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export async function shouldUseDemoAdapter(): Promise<boolean> {
  if (isDemoMode()) return true;
  const flag = await AsyncStorage.getItem(DEMO_SESSION_KEY);
  if (flag === '1') return true;
  const tok = await AsyncStorage.getItem('fos_token');
  return tok === DEMO_TOKEN;
}
