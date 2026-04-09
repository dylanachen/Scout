import { useMemo, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationRow from '../components/NotificationRow';
import { FILTER_TABS, notificationMatchesFilter } from '../utils/notificationModel';

const tabLabels = [
  [FILTER_TABS.ALL, 'All'],
  [FILTER_TABS.UNREAD, 'Unread'],
  [FILTER_TABS.SCOPE, 'Scope'],
  [FILTER_TABS.INVOICES, 'Invoices'],
  [FILTER_TABS.MESSAGES, 'Messages'],
  [FILTER_TABS.MEETINGS, 'Meetings'],
];

export default function Notifications() {
  const { loading, err, items, markAllRead, markRead, isRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState(FILTER_TABS.ALL);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (!notificationMatchesFilter(n, filter)) return false;
      if (filter === FILTER_TABS.UNREAD) return !isRead(n.id);
      return true;
    });
  }, [items, filter, isRead]);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Notifications</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Updates across projects, invoices, and matches.</p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: unreadCount === 0 ? 'var(--color-surface-2)' : 'var(--color-surface)',
            color: unreadCount === 0 ? 'var(--color-text-3)' : 'var(--color-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: unreadCount === 0 ? 'default' : 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Mark all as read
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Filter notifications"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 16,
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 2,
        }}
      >
        {tabLabels.map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: active ? 'rgba(29, 110, 205, 0.1)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {err && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{err}</div>
      )}
      {loading && <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-3)' }}>Loading…</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map((n) => (
          <li
            key={n.id}
            style={{
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <NotificationRow n={n} unread={!isRead(n.id)} markRead={markRead} />
          </li>
        ))}
        {!filtered.length && !loading && (
          <li style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>
            {filter === FILTER_TABS.UNREAD ? 'No unread notifications.' : 'No notifications in this view.'}
          </li>
        )}
      </ul>
    </div>
  );
}
