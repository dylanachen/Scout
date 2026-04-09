import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeTotals, getInvoices, upsertInvoice } from '../utils/invoiceStorage';
import { formatShortDate } from '../utils/dashboard';

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'];

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
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
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

export default function Invoices() {
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');

  const rows = useMemo(() => {
    void tick;
    return getInvoices();
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((inv) => getDisplayStatus(inv) === filter);
  }, [rows, filter]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const markPaid = (inv) => {
    upsertInvoice({
      ...inv,
      status: 'paid',
      timeline: {
        ...inv.timeline,
        paidAt: new Date().toISOString(),
      },
    });
    refresh();
  };

  const sendReminder = () => {
    setToast('Reminder queued (demo).');
    window.setTimeout(() => setToast(''), 2800);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Invoices</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>All invoices across your projects.</p>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((inv) => {
          const display = getDisplayStatus(inv);
          const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
          const overdue = display === 'overdue';
          const b = BADGE[display];
          const overdueDays = overdue ? daysOverdue(inv) : 0;

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
                padding: '16px 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>{inv.invoiceNumber}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>{inv.clientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{inv.projectName}</div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(total)}</span>
                <span style={{ fontSize: 12, color: overdue ? '#dc2626' : 'var(--color-text-3)', fontWeight: overdue ? 700 : 400 }}>
                  {overdue && overdueDays > 0
                    ? `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
                    : `Due ${inv.dueDate ? formatShortDate(parseISODate(inv.dueDate) ?? new Date()) : '—'}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!filtered.length ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 12 }}>No invoices match this filter.</p>
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
