import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { computeTotals } from '../utils/invoiceStorage';
import { formatShortDate } from '../utils/dashboard';
import { downloadCsv } from '../utils/exportCsv';
import { showToast } from '../utils/toast';

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'];

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function parseAmountString(s) {
  const n = parseFloat(String(s ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeInvoice(raw) {
  const amountNumber =
    raw.amount_cents != null
      ? Number(raw.amount_cents) / 100
      : parseAmountString(raw.amount);
  const lineItems = Array.isArray(raw.line_items) && raw.line_items.length
    ? raw.line_items
    : [{
        id: `li_${raw.id}`,
        description: raw.description || raw.title || raw.project_name || 'Services',
        kind: 'service',
        hoursOrQty: 1,
        rate: amountNumber,
        total: amountNumber,
      }];
  return {
    id: String(raw.id),
    invoiceNumber: raw.invoice_number || raw.title || `INV-${String(raw.id).slice(-6).toUpperCase()}`,
    projectId: raw.project_id ?? null,
    projectName: raw.project_name ?? '—',
    clientName: raw.client_name ?? '—',
    clientEmail: raw.client_email ?? '',
    submitterName: raw.submitter_name ?? null,
    submitterEmail: raw.submitter_email ?? null,
    invoiceDate: raw.issued_at ?? raw.created_at ?? null,
    dueDate: raw.due_date ?? null,
    lineItems,
    taxPercent: raw.tax_percent ?? null,
    notes: raw.notes ?? raw.description ?? '',
    status: raw.status ?? 'draft',
    amountCents: raw.amount_cents ?? Math.round(amountNumber * 100),
    attachmentUrl: raw.attachment_url ?? null,
    attachmentName: raw.attachment_name ?? null,
    attachmentType: raw.attachment_type ?? null,
    attachmentSize: raw.attachment_size ?? null,
    timeline: {
      sentAt: raw.sent_at ?? null,
      viewedAt: raw.viewed_at ?? null,
      paidAt: raw.paid_at ?? null,
    },
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? raw.created_at ?? null,
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseISODate(s) {
  if (!s) return null;
  const d = new Date(`${String(s).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {ReturnType<typeof getInvoices>[number]} inv */
function getDisplayStatus(inv) {
  if (inv.status === 'draft') return 'draft';
  if (inv.status === 'paid') return 'paid';
  const due = parseISODate(inv.dueDate);
  const today = startOfToday();
  if (due && due < today) return 'overdue';
  if (inv.status === 'viewed') return 'sent';
  return 'sent';
}

function daysOverdue(inv) {
  const due = parseISODate(inv.dueDate);
  if (!due) return 0;
  const today = startOfToday();
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

const BADGE = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  sent: { label: 'Sent', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  paid: { label: 'Paid', bg: '#dcfce7', color: '#166534', border: '#86efac' },
  overdue: { label: 'Overdue', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

function fmtMoney(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function fmtTs(iso) {
  if (!iso) return '—';
  try {
    return formatShortDate(new Date(iso)) + ' · ' + new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}

function InvoiceDetailModal({ inv, onClose, onMarkPaid, onReminder }) {
  if (!inv) return null;
  const { subtotal, tax, total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
  const display = getDisplayStatus(inv);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invoice detail"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15,22,35,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 640,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 14,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: 22,
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>Invoice</div>
            <h2 style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{inv.invoiceNumber}</h2>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{inv.projectName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 22,
              cursor: 'pointer',
              color: 'var(--color-text-3)',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '5px 8px',
              borderRadius: 8,
              background: BADGE[display].bg,
              color: BADGE[display].color,
              border: `1px solid ${BADGE[display].border}`,
            }}
          >
            {BADGE[display].label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
            Due {inv.dueDate ? formatShortDate(parseISODate(inv.dueDate) ?? new Date()) : '—'}
          </span>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Bill to</div>
          <div style={{ fontWeight: 700 }}>{inv.clientName}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{inv.clientEmail}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 700 }}>
              <th style={{ padding: '8px 8px 8px 0' }}>Description</th>
              <th style={{ padding: '8px 8px', textAlign: 'right' }}>Qty / hrs</th>
              <th style={{ padding: '8px 0 8px 8px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(inv.lineItems ?? []).map((li) => (
              <tr key={li.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 8px 10px 0', verticalAlign: 'top' }}>
                  {li.description}
                  {li.kind === 'change_order' ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: '#92400e',
                        background: '#fef3c7',
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}
                    >
                      Change order
                    </span>
                  ) : null}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{li.hoursOrQty}</td>
                <td style={{ padding: '10px 0 10px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(li.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--color-text-3)' }}>Subtotal </span>
            {fmtMoney(subtotal)}
          </div>
          {inv.taxPercent != null && Number(inv.taxPercent) > 0 ? (
            <div>
              <span style={{ color: 'var(--color-text-3)' }}>Tax ({inv.taxPercent}%) </span>
              {fmtMoney(tax)}
            </div>
          ) : null}
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            <span style={{ color: 'var(--color-text-3)' }}>Total </span>
            {fmtMoney(total)}
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: 10 }}>Timeline</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <li>
              <span style={{ color: 'var(--color-text-3)' }}>Created </span>
              {fmtTs(inv.createdAt)}
            </li>
            <li>
              <span style={{ color: 'var(--color-text-3)' }}>Sent </span>
              {fmtTs(inv.timeline?.sentAt)}
            </li>
            <li>
              <span style={{ color: 'var(--color-text-3)' }}>Viewed </span>
              {fmtTs(inv.timeline?.viewedAt)}
            </li>
            <li>
              <span style={{ color: 'var(--color-text-3)' }}>Paid </span>
              {fmtTs(inv.timeline?.paidAt)}
            </li>
          </ul>
        </div>

        {inv.notes?.trim() ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap' }}>{inv.notes}</div>
          </div>
        ) : null}

        {inv.attachmentUrl ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Attachment</div>
            {inv.attachmentType?.startsWith('image/') ? (
              <a href={`${API_BASE}${inv.attachmentUrl}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={`${API_BASE}${inv.attachmentUrl}`}
                  alt={inv.attachmentName || 'Attachment'}
                  style={{
                    width: '100%', maxHeight: 400, objectFit: 'contain',
                    borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                  }}
                />
              </a>
            ) : (
              <a
                href={`${API_BASE}${inv.attachmentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-primary)', textDecoration: 'none',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                {inv.attachmentName || 'View attachment'}
              </a>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {display === 'overdue' ? (
            <button
              type="button"
              onClick={onReminder}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: '#991b1b',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Send Reminder
            </button>
          ) : null}
          {inv.status !== 'paid' && inv.status !== 'draft' ? (
            <button
              type="button"
              onClick={onMarkPaid}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Mark as paid
            </button>
          ) : null}
          {inv.projectId ? (
            <Link
              to={`/projects/${inv.projectId}/invoice-draft`}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              New invoice for project
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const toolbarBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};

export default function Invoices() {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get('/invoices');
      setRows(Array.isArray(data) ? data.map(normalizeInvoice) : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to load invoices');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((inv) => getDisplayStatus(inv) === filter);
  }, [rows, filter]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  // Group filtered invoices by project, compute per-project totals and grand totals
  const grouped = useMemo(() => {
    const by = new Map();
    for (const inv of filtered) {
      const key = inv.projectId ?? '__none__';
      if (!by.has(key)) {
        by.set(key, {
          projectId: inv.projectId,
          projectName: inv.projectName || '—',
          clientName: inv.clientName,
          invoices: [],
          total: 0,
          paidTotal: 0,
          outstandingTotal: 0,
        });
      }
      const g = by.get(key);
      const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
      g.invoices.push(inv);
      g.total += total;
      if (inv.status === 'paid') g.paidTotal += total;
      else g.outstandingTotal += total;
    }
    // Sort groups by largest total first
    return Array.from(by.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const grandTotals = useMemo(() => {
    let total = 0, paid = 0, outstanding = 0;
    for (const g of grouped) {
      total += g.total;
      paid += g.paidTotal;
      outstanding += g.outstandingTotal;
    }
    return { total, paid, outstanding };
  }, [grouped]);

  const markPaid = async (inv) => {
    try {
      await api.patch(`/invoices/${inv.id}`, { status: 'paid' });
      await load();
      showToast('Invoice marked as paid', 'success');
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Failed to mark paid', 'error');
    }
  };

  const sendReminder = () => {
    setToast('Reminder queued.');
    window.setTimeout(() => setToast(''), 2800);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Invoices</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>All invoices across your projects.</p>
        </div>
        <div className="scout-no-print" style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              const exportRows = rows.map((inv) => {
                const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
                return {
                  invoice: inv.invoiceNumber,
                  client: inv.clientName,
                  project: inv.projectName,
                  status: getDisplayStatus(inv),
                  due: inv.dueDate,
                  total,
                };
              });
              downloadCsv(`scout-invoices-${Date.now()}.csv`, exportRows);
              showToast('Invoices CSV downloaded', 'success');
            }}
            style={toolbarBtn}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={toolbarBtn}
          >
            Print
          </button>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#eff6ff',
            color: '#1e40af',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const label = f === 'all' ? 'All' : BADGE[f].label;
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: active ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
                color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Totals summary */}
      {!loading && rows.length > 0 && (
        <div
          style={{
            marginBottom: 18,
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: 'linear-gradient(180deg, var(--color-surface), var(--color-surface-2))',
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total billed</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
              {fmtMoney(grandTotals.total)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paid</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2, color: '#16a34a' }}>
              {fmtMoney(grandTotals.paid)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2, color: '#b45309' }}>
              {fmtMoney(grandTotals.outstanding)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, color: 'var(--color-text-3)' }}>
            {filtered.length} invoice{filtered.length === 1 ? '' : 's'} across {grouped.length} project{grouped.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {/* Grouped by project */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {grouped.map((g) => (
          <section key={g.projectId ?? 'none'}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 12, marginBottom: 10, flexWrap: 'wrap',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {g.projectName}
                </h2>
                {g.clientName && g.clientName !== '—' ? (
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{g.clientName}</div>
                ) : null}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(g.total)}</span>
                <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>
                  {' · '}{g.invoices.length} invoice{g.invoices.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 12,
              }}
            >
              {g.invoices.map((inv) => {
                const display = getDisplayStatus(inv);
                const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
                const overdue = display === 'overdue';
                const b = BADGE[display];
                const overdueDays = overdue ? daysOverdue(inv) : 0;
                const absUrl = inv.attachmentUrl ? `${API_BASE}${inv.attachmentUrl}` : null;
                const isImage = inv.attachmentType?.startsWith('image/');

                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedId(inv.id)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 14,
                      border: '1px solid var(--color-border)',
                      borderLeft: overdue ? '4px solid #dc2626' : '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      padding: '14px 14px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>{inv.invoiceNumber}</div>
                        {inv.submitterName && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            Submitted by {inv.submitterName}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '5px 8px',
                          borderRadius: 8,
                          background: b.bg,
                          color: b.color,
                          border: `1px solid ${b.border}`,
                          flexShrink: 0,
                        }}
                      >
                        {b.label}
                      </span>
                    </div>

                    {absUrl && (
                      isImage ? (
                        <img
                          src={absUrl}
                          alt={inv.attachmentName || 'Attachment'}
                          style={{
                            width: '100%', maxHeight: 140, objectFit: 'cover',
                            borderRadius: 8, border: '1px solid var(--color-border)',
                          }}
                        />
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface-2)',
                          fontSize: 12, color: 'var(--color-text-2)',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.attachmentName || 'Attached file'}
                          </span>
                        </div>
                      )
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(total)}</span>
                      <span style={{ fontSize: 12, color: overdue ? '#dc2626' : 'var(--color-text-3)', fontWeight: overdue ? 700 : 400 }}>
                        {overdue && overdueDays > 0
                          ? `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
                          : inv.dueDate
                            ? `Due ${formatShortDate(parseISODate(inv.dueDate) ?? new Date())}`
                            : inv.invoiceDate
                              ? `Issued ${formatShortDate(parseISODate(inv.invoiceDate) ?? new Date())}`
                              : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 12 }}>Loading invoices…</p>
      ) : err ? (
        <p style={{ fontSize: 13, color: '#991b1b', marginTop: 12 }}>{err}</p>
      ) : !filtered.length ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 12 }}>
          {rows.length ? 'No invoices match this filter.' : 'No invoices yet. Open a project to generate one.'}
        </p>
      ) : null}

      <div style={{ marginTop: 24, fontSize: 13, color: 'var(--color-text-3)' }}>
        <Link to="/projects" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Open a project
        </Link>{' '}
        to create a new invoice draft.
      </div>

      {selected ? (
        <InvoiceDetailModal
          inv={selected}
          onClose={() => setSelectedId(null)}
          onMarkPaid={() => {
            markPaid(selected);
            setSelectedId(null);
          }}
          onReminder={sendReminder}
        />
      ) : null}
    </div>
  );
}
