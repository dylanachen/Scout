import type { InternalAxiosRequestConfig } from 'axios';

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
    return { status: 200, data: { access_token: 'freelanceos-demo-token' } };
  }
  if (method === 'POST' && path === '/auth/register') {
    return { status: 201, data: { ok: true } };
  }
  if (method === 'GET' && path === '/auth/me') {
    return {
      status: 200,
      data: { id: 1, email: 'demo@freelanceos.local', name: 'Demo Freelancer' },
    };
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
