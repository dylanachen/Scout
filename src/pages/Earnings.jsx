import { useMemo } from 'react';
import { computeTotals, getInvoices } from '../utils/invoiceStorage';
import { downloadCsv } from '../utils/exportCsv';
import { showToast } from '../utils/toast';

function monthKey(d) {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(monthKey(cur));
  }
  return out;
}

function fmtMoney(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
}

export default function Earnings() {
  const invoices = useMemo(() => getInvoices(), []);

  const byMonth = useMemo(() => {
    const months = lastMonths(6);
    const paid = Object.fromEntries(months.map((m) => [m, 0]));
    const pending = Object.fromEntries(months.map((m) => [m, 0]));
    invoices.forEach((inv) => {
      const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
      const mk = monthKey(inv.timeline?.paidAt || inv.createdAt);
      if (!mk || !(mk in paid)) return;
      if (inv.status === 'paid') paid[mk] += total;
      else if (inv.status !== 'draft') pending[mk] += total;
    });
    return { months, paid, pending };
  }, [invoices]);

  const { paidTotal, pendingTotal, draftTotal, byClient } = useMemo(() => {
    let p = 0;
    let q = 0;
    let d = 0;
    const clients = new Map();
    invoices.forEach((inv) => {
      const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
      if (inv.status === 'paid') p += total;
      else if (inv.status === 'draft') d += total;
      else q += total;
      const cur = clients.get(inv.clientName || 'Unknown') || 0;
      if (inv.status === 'paid') clients.set(inv.clientName || 'Unknown', cur + total);
    });
    const list = [...clients.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    return { paidTotal: p, pendingTotal: q, draftTotal: d, byClient: list };
  }, [invoices]);

  const maxMonth = Math.max(1, ...byMonth.months.map((m) => byMonth.paid[m] + byMonth.pending[m]));
  const totalByClient = byClient.reduce((a, b) => a + b.amount, 0) || 1;

  const exportCsv = () => {
    const rows = invoices.map((inv) => {
      const { total } = computeTotals(inv.lineItems ?? [], inv.taxPercent);
      return {
        invoice: inv.invoiceNumber,
        client: inv.clientName,
        status: inv.status,
        total,
        due: inv.dueDate,
        created: inv.createdAt,
        paid: inv.timeline?.paidAt || '',
      };
    });
    downloadCsv('scout-earnings.csv', rows);
    showToast('Earnings CSV downloaded', 'success');
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Earnings</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            Revenue by month and client based on your invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
        <KpiCard label="Paid (all-time)" value={fmtMoney(paidTotal)} tone="#10b981" />
        <KpiCard label="Outstanding" value={fmtMoney(pendingTotal)} tone="#f59e0b" />
        <KpiCard label="Drafts" value={fmtMoney(draftTotal)} tone="#6366f1" />
        <KpiCard label="Invoices" value={invoices.length} tone="#64748b" />
      </div>

      <Card title="Revenue — last 6 months">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 180, paddingTop: 10 }}>
          {byMonth.months.map((m) => {
            const paid = byMonth.paid[m];
            const pending = byMonth.pending[m];
            const paidH = (paid / maxMonth) * 140;
            const pendH = (pending / maxMonth) * 140;
            return (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 150, width: '100%', maxWidth: 48 }}>
                  <div style={{ height: pendH, background: '#fbbf24', borderRadius: '6px 6px 0 0', opacity: 0.8 }} title={`Pending ${fmtMoney(pending)}`} />
                  <div style={{ height: paidH, background: '#10b981', borderRadius: pendH > 0 ? 0 : '6px 6px 0 0' }} title={`Paid ${fmtMoney(paid)}`} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>{m.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--color-text-3)' }}>
          <Legend color="#10b981" label="Paid" />
          <Legend color="#fbbf24" label="Pending / sent" />
        </div>
      </Card>

      <div style={{ height: 16 }} />

      <Card title="Top clients (paid)">
        {byClient.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>No paid invoices yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byClient.map((c) => (
              <li key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{c.name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtMoney(c.amount)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.amount / totalByClient) * 100}%`, background: 'var(--color-primary)', height: '100%' }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 14, padding: 18 }}>
      {title ? <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>{title}</h2> : null}
      {children}
    </section>
  );
}

function KpiCard({ label, value, tone }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, background: 'var(--color-surface)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-3)', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: tone, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}
