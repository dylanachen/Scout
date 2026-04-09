import { isDemoMode } from '../api/demoAdapter';

const INVOICES_KEY = 'fos_invoices_v1';
const SEQ_KEY = 'fos_invoice_seq_v1';
const APPROVED_CO_KEY = 'fos_approved_change_orders_v1';

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function newId() {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slugEmail(clientName) {
  const s = String(clientName ?? 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
  return `${s || 'client'}@billing.example.com`;
}

export function getInvoices() {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (!raw) {
      seedIfDemoEmpty();
      return readRaw();
    }
    const arr = safeParse(raw, []);
    if (!Array.isArray(arr) || arr.length === 0) {
      seedIfDemoEmpty();
      return readRaw();
    }
    return arr;
  } catch {
    return [];
  }
}

function readRaw() {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    const arr = safeParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function seedIfDemoEmpty() {
  if (!isDemoMode()) return;
  const cur = readRaw();
  if (cur.length > 0) return;

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const sample = [
    {
      id: newId(),
      invoiceNumber: 'INV-2026-0104',
      projectId: 'demo-p1',
      projectName: 'Website refresh',
      clientName: 'Northwind LLC',
      clientEmail: slugEmail('Northwind LLC'),
      invoiceDate: iso(today),
      dueDate: iso(addDays(today, 10)),
      lineItems: [
        {
          id: `li_${Date.now()}_a`,
          description: 'Professional services (time logged)',
          kind: 'service',
          hoursOrQty: 18.5,
          rate: 125,
          total: Math.round(18.5 * 125 * 100) / 100,
        },
        {
          id: `li_${Date.now()}_b`,
          description: 'Change order: Additional hero animations',
          kind: 'change_order',
          hoursOrQty: 1,
          rate: 125,
          total: 125,
        },
      ],
      taxPercent: null,
      notes: 'Net 14. Thank you for your business.',
      status: 'sent',
      timeline: { sentAt: '2026-04-07T14:00:00.000Z', viewedAt: null, paidAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: newId(),
      invoiceNumber: 'INV-2026-0105',
      projectId: 'demo-p2',
      projectName: 'Pitch deck',
      clientName: 'Blue Harbor',
      clientEmail: slugEmail('Blue Harbor'),
      invoiceDate: iso(addDays(today, -5)),
      dueDate: iso(addDays(today, -2)),
      lineItems: [
        {
          id: `li_${Date.now()}_c`,
          description: 'Milestone — deck design & narrative',
          kind: 'service',
          hoursOrQty: 12,
          rate: 150,
          total: 1800,
        },
      ],
      taxPercent: 8,
      notes: '',
      status: 'viewed',
      timeline: {
        sentAt: '2026-04-01T10:00:00.000Z',
        viewedAt: '2026-04-02T09:30:00.000Z',
        paidAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: newId(),
      invoiceNumber: 'INV-2026-0098',
      projectId: 'demo-p3',
      projectName: 'Analytics dashboard',
      clientName: 'Summit Co.',
      clientEmail: slugEmail('Summit Co.'),
      invoiceDate: iso(addDays(today, -20)),
      dueDate: iso(addDays(today, -5)),
      lineItems: [
        {
          id: `li_${Date.now()}_d`,
          description: 'Sprint implementation (time logged)',
          kind: 'service',
          hoursOrQty: 32,
          rate: 135,
          total: 4320,
        },
      ],
      taxPercent: null,
      notes: 'Please remit within terms.',
      status: 'sent',
      timeline: { sentAt: '2026-03-18T16:00:00.000Z', viewedAt: '2026-03-19T11:00:00.000Z', paidAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: newId(),
      invoiceNumber: 'INV-2026-0100',
      projectId: 'demo-p1',
      projectName: 'Website refresh',
      clientName: 'Northwind LLC',
      clientEmail: slugEmail('Northwind LLC'),
      invoiceDate: iso(addDays(today, -2)),
      dueDate: iso(addDays(today, 12)),
      lineItems: [
        {
          id: `li_${Date.now()}_e`,
          description: 'Deposit — kickoff & discovery',
          kind: 'service',
          hoursOrQty: 1,
          rate: 2400,
          total: 2400,
        },
      ],
      taxPercent: null,
      notes: '',
      status: 'paid',
      timeline: {
        sentAt: '2026-04-06T09:00:00.000Z',
        viewedAt: '2026-04-06T10:00:00.000Z',
        paidAt: '2026-04-07T15:22:00.000Z',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: newId(),
      invoiceNumber: 'INV-2026-0106',
      projectId: 'demo-p2',
      projectName: 'Pitch deck',
      clientName: 'Blue Harbor',
      clientEmail: slugEmail('Blue Harbor'),
      invoiceDate: iso(today),
      dueDate: iso(addDays(today, 14)),
      lineItems: [
        {
          id: `li_${Date.now()}_f`,
          description: 'Copy edits (hourly)',
          kind: 'service',
          hoursOrQty: 3,
          rate: 150,
          total: 450,
        },
      ],
      taxPercent: null,
      notes: 'Draft — not sent.',
      status: 'draft',
      timeline: { sentAt: null, viewedAt: null, paidAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(sample));
  } catch {
    /* ignore */
  }
}

export function setInvoices(list) {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getInvoice(id) {
  return getInvoices().find((x) => x.id === id) ?? null;
}

export function upsertInvoice(record) {
  const all = getInvoices();
  const i = all.findIndex((x) => x.id === record.id);
  const prev = i >= 0 ? all[i] : null;
  const next = {
    ...record,
    createdAt: prev?.createdAt ?? record.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (i >= 0) all[i] = next;
  else all.push(next);
  setInvoices(all);
  return next;
}

export function generateInvoiceNumber() {
  let n = 1040;
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const parsed = parseInt(String(raw ?? ''), 10);
    if (Number.isFinite(parsed)) n = parsed;
  } catch {
    /* ignore */
  }
  n += 1;
  try {
    localStorage.setItem(SEQ_KEY, String(n));
  } catch {
    /* ignore */
  }
  const y = new Date().getFullYear();
  return `INV-${y}-${String(n).padStart(4, '0')}`;
}

/** @returns {{ id: string, description: string, hours: number, rate: number, total: number }[]} */
export function getApprovedChangeOrders(projectId) {
  try {
    const raw = localStorage.getItem(APPROVED_CO_KEY);
    const arr = safeParse(raw, []);
    const list = Array.isArray(arr) ? arr.filter((x) => String(x.projectId) === String(projectId) && x.approved !== false) : [];
    if (list.length > 0) return list;
  } catch {
    /* ignore */
  }
  if (String(projectId) === 'demo-p1') {
    return [
      {
        id: 'co_demo_p1_1',
        projectId: 'demo-p1',
        description: 'Change order: Additional hero animations (approved)',
        hours: 1,
        rate: 125,
        total: 125,
        approved: true,
      },
    ];
  }
  return [];
}

const DEFAULT_RATE_KEY = 'freelanceos_default_hourly_rate';

export function loadDefaultHourlyRate() {
  try {
    const raw = localStorage.getItem(DEFAULT_RATE_KEY);
    const n = parseFloat(String(raw ?? ''));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return 125;
}

/**
 * Build suggested line items from time entries + approved change orders.
 * @param {string} projectId
 * @param {string} projectName
 * @param {{ durationMinutes?: number, description?: string }[]} entries
 */
export function buildSuggestedLineItems(projectId, projectName, entries) {
  const rate = loadDefaultHourlyRate();
  const rows = [];

  const forProject = (entries ?? []).filter((e) => String(e.projectId) === String(projectId));
  const totalMinutes = forProject.reduce((a, e) => a + (Number(e.durationMinutes) || 0), 0);
  const hours = Math.round((totalMinutes / 60) * 100) / 100;

  if (hours > 0) {
    const total = Math.round(hours * rate * 100) / 100;
    rows.push({
      id: newId(),
      description: `Professional services — ${projectName} (from time logs)`,
      kind: 'service',
      hoursOrQty: hours,
      rate,
      total,
    });
  } else {
    rows.push({
      id: newId(),
      description: `Professional services — ${projectName}`,
      kind: 'service',
      hoursOrQty: 1,
      rate,
      total: rate,
    });
  }

  for (const co of getApprovedChangeOrders(projectId)) {
    rows.push({
      id: newId(),
      description: co.description ?? 'Approved change order',
      kind: 'change_order',
      hoursOrQty: co.hours ?? 1,
      rate: co.rate ?? rate,
      total: co.total ?? Math.round((co.hours ?? 1) * (co.rate ?? rate) * 100) / 100,
    });
  }

  return rows;
}

export function computeTotals(lineItems, taxPercent) {
  const subtotal = lineItems.reduce((a, li) => a + (Number(li.total) || 0), 0);
  const pct = taxPercent != null && taxPercent !== '' ? Number(taxPercent) : null;
  const tax =
    pct != null && Number.isFinite(pct) && pct > 0 ? Math.round(subtotal * (pct / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, tax, total };
}

export { newId, slugEmail };
