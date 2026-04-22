import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { getInvoices } from '../utils/invoiceStorage';
import EmptyState from '../components/EmptyState';

function relative(iso) {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CategoryTag({ label, color }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '3px 7px',
        borderRadius: 6,
        background: color,
        color: '#fff',
      }}
    >
      {label}
    </span>
  );
}

export default function Inbox() {
  const { notifications } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    setInvoices(getInvoices());
  }, []);

  const items = useMemo(() => {
    const notes = (notifications || []).map((n) => ({
      id: `note-${n.id}`,
      category: 'notification',
      title: n.title || n.message || 'Notification',
      subtitle: n.body || n.subtitle || '',
      at: n.createdAt || n.timestamp,
      href: n.href || '/notifications',
      unread: !n.read,
    }));

    const invs = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'overdue')
      .map((inv) => ({
        id: `inv-${inv.id}`,
        category: 'invoice',
        title: `Invoice ${inv.invoiceNumber} · ${inv.clientName}`,
        subtitle: inv.status === 'overdue' ? 'Overdue — follow up' : 'Awaiting payment',
        at: inv.createdAt,
        href: '/invoices',
        unread: inv.status === 'overdue',
      }));

    const merged = [...notes, ...invs].sort((a, b) => {
      const ta = new Date(a.at || 0).getTime();
      const tb = new Date(b.at || 0).getTime();
      return tb - ta;
    });

    if (filter === 'unread') return merged.filter((x) => x.unread);
    if (filter !== 'all') return merged.filter((x) => x.category === filter);
    return merged;
  }, [notifications, invoices, filter]);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Unified Inbox</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--color-text-3)', fontSize: 13 }}>
        Chat previews, notifications, and invoice actions in one place.
      </p>

      <div role="tablist" aria-label="Inbox filters" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'unread', 'notification', 'invoice'].map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: filter === f ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === f ? '#fff' : 'var(--color-text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing here" body="New messages, notifications, and invoices will appear in the inbox." />
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)' }}>
          {items.map((it, idx) => (
            <li
              key={it.id}
              style={{
                borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <Link
                to={it.href}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  alignItems: 'center',
                  background: it.unread ? 'var(--color-surface-2)' : 'transparent',
                }}
              >
                <CategoryTag
                  label={it.category === 'notification' ? 'Note' : 'Invoice'}
                  color={it.category === 'notification' ? '#3b82f6' : '#10b981'}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{it.title}</div>
                  {it.subtitle ? (
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{it.subtitle}</div>
                  ) : null}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{relative(it.at)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
