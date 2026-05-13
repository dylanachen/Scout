import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useDashboardData } from '../hooks/useDashboardData';
import NotificationRow from './NotificationRow';

export default function NotificationBell() {
  const { items, unreadCount, markAllRead, markRead, isRead } = useNotifications();
  const { counts: unreadCounts, markAllProjectsRead, total: liveUnreadTotal } = useUnreadMessages();
  const { projects } = useDashboardData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const handleMarkAllRead = () => {
    markAllRead();
    markAllProjectsRead((projects ?? []).map((p) => p.id));
  };
  const totalUnreadShown = unreadCount + liveUnreadTotal;

  // Projects with unread chat messages — surfaced in the dropdown so the user
  // can see *which* chat is buzzing, not just that "something" is unread.
  const unreadProjects = (projects ?? [])
    .map((p) => ({ ...p, unread: Number(unreadCounts?.[String(p.id)]) || 0 }))
    .filter((p) => p.unread > 0);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const preview = items.slice(0, 10);

  return (
    <div ref={wrapRef} className="desktop-notifications-bell" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          totalUnreadShown
            ? `Notifications, ${totalUnreadShown} unread`
            : 'Notifications'
        }
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          cursor: 'pointer',
          color: 'var(--color-text-2)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {totalUnreadShown > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: 'var(--color-danger)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 0 0 2px var(--color-surface-2)',
            }}
          >
            {totalUnreadShown > 99 ? '99+' : totalUnreadShown}
          </span>
        ) : null}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 'min(400px, calc(100vw - 40px))',
            maxHeight: 'min(420px, 70vh)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            boxShadow: '0 12px 40px rgba(15,22,35,0.14)',
            zIndex: 1001,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={totalUnreadShown === 0}
              style={{
                border: 'none',
                background: 'transparent',
                color: totalUnreadShown === 0 ? 'var(--color-text-3)' : 'var(--color-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: totalUnreadShown === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Mark all as read
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 6px 10px' }}>
            {unreadProjects.length > 0 && (
              <div style={{ padding: '6px 8px 10px' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-3)',
                    margin: '0 0 6px 4px',
                  }}
                >
                  Chat ({unreadProjects.reduce((a, p) => a + p.unread, 0)} new)
                </div>
                {unreadProjects.map((p) => (
                  <Link
                    key={p.id}
                    to="/chat"
                    state={{ projectId: p.id }}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                      background: 'var(--color-surface-2)',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      aria-hidden
                    >
                      {String(p.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)' }}>
                        {p.unread} new message{p.unread === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span
                      style={{
                        minWidth: 20,
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 9,
                        background: 'var(--color-danger)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {p.unread > 99 ? '99+' : p.unread}
                    </span>
                  </Link>
                ))}
                {preview.length > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-text-3)',
                      margin: '12px 0 2px 4px',
                    }}
                  >
                    Updates
                  </div>
                )}
              </div>
            )}
            {preview.length === 0 && unreadProjects.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 12px', fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center' }}>
                No notifications yet.
              </p>
            ) : (
              preview.map((n) => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <NotificationRow
                    n={n}
                    compact
                    unread={!isRead(n.id)}
                    markRead={markRead}
                    onBeforeNavigate={() => setOpen(false)}
                  />
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-primary)',
                textDecoration: 'none',
              }}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
