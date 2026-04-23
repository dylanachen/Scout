import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import UserNavMenu from './UserNavMenu';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

const COLLAPSE_KEY = 'scout_nav_collapsed_v1';

function Badge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
      background: 'var(--color-danger)', color: '#fff',
      fontSize: 10, fontWeight: 700, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Tiny red dot shown on top-right of icon in collapsed mode. */
function Dot() {
  return (
    <span style={{
      position: 'absolute', top: -2, right: -2,
      width: 8, height: 8, borderRadius: '50%',
      background: 'var(--color-danger)',
      border: '2px solid var(--color-surface)',
    }} />
  );
}

function linkStyle(isActive, collapsed) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 10,
    padding: collapsed ? '10px 0' : '10px 14px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: isActive ? (collapsed ? 10 : '0 10px 10px 0') : 10,
    borderLeft: isActive && !collapsed ? '3px solid var(--color-primary)' : '3px solid transparent',
    fontSize: 13,
    fontWeight: 600,
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-2)',
    background: isActive ? 'rgba(29, 110, 205, 0.08)' : 'transparent',
    textDecoration: 'none',
    position: 'relative',
  };
}

function NavIcon({ children, badge = false }) {
  return (
    <span style={{
      width: 20, display: 'inline-flex', justifyContent: 'center',
      opacity: 0.85, position: 'relative', flexShrink: 0,
    }} aria-hidden>
      {children}
      {badge && <Dot />}
    </span>
  );
}

function Label({ children, collapsed }) {
  if (collapsed) return null;
  return <span style={{ whiteSpace: 'nowrap' }}>{children}</span>;
}

export default function NavSidebar() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { total: unreadMessages } = useUnreadMessages();
  const isClient = user?.role === 'client';

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    // Broadcast so other layout pieces can react via CSS class
    document.documentElement.dataset.navCollapsed = collapsed ? '1' : '0';
  }, [collapsed]);

  const toggle = () => setCollapsed((v) => !v);

  return (
    <aside className={`nav-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div style={{
        padding: collapsed ? '12px 8px' : '16px 14px 18px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        {!collapsed && (
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em' }}>Scout</div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28, height: 28, padding: 0, borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav style={{
        flex: 1,
        padding: collapsed ? '12px 6px' : 12,
        display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto',
      }}>
        <NavLink to="/" end style={({ isActive }) => linkStyle(isActive, collapsed)} title="Dashboard">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Dashboard</Label>
            </>
          )}
        </NavLink>

        <NavLink to="/projects" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Projects">
          {({ isActive }) => (
            <>
              <NavIcon badge={collapsed && unreadMessages > 0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              {!collapsed && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Projects <Badge count={unreadMessages} />
                </span>
              )}
            </>
          )}
        </NavLink>

        <NavLink to="/pipeline" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Pipeline">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 5h4v14H4V5zm6 4h4v10h-4V9zm6 3h4v7h-4v-7z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Pipeline</Label>
            </>
          )}
        </NavLink>

        <NavLink to="/invoices" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Invoices">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M7 3h8l3 3v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 12h6M9 16h6M9 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Invoices</Label>
            </>
          )}
        </NavLink>

        <NavLink to="/chat" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Chat">
          {({ isActive }) => (
            <>
              <NavIcon badge={collapsed && unreadMessages > 0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              {!collapsed && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Chat <Badge count={unreadMessages} />
                </span>
              )}
            </>
          )}
        </NavLink>

        <NavLink to="/matches" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Matches">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="9" r="3.5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="15" cy="15" r="3.5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Matches</Label>
            </>
          )}
        </NavLink>

        <NavLink to="/interests" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Interests">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 10c0 5.65-7 10-7 10z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Interests</Label>
            </>
          )}
        </NavLink>

        {!isClient && (
          <NavLink to="/invitations" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Invitations">
            {({ isActive }) => (
              <>
                <NavIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </NavIcon>
                <Label collapsed={collapsed}>Invitations</Label>
              </>
            )}
          </NavLink>
        )}

        <NavLink to="/notifications" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Notifications">
          {({ isActive }) => (
            <>
              <NavIcon badge={collapsed && unreadCount > 0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              {!collapsed && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Notifications <Badge count={unreadCount} />
                </span>
              )}
            </>
          )}
        </NavLink>

        <NavLink to="/settings" style={({ isActive }) => linkStyle(isActive, collapsed)} title="Settings">
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00-.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .55.22 1.05.59 1.41.36.37.86.59 1.41.59H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                    fill={isActive ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" fill={isActive ? 'var(--color-surface)' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </NavIcon>
              <Label collapsed={collapsed}>Settings</Label>
            </>
          )}
        </NavLink>
      </nav>

      <div
        style={{
          padding: collapsed ? '10px 6px 14px' : '12px 14px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'stretch',
        }}
      >
        <UserNavMenu variant={collapsed ? 'compact' : 'sidebar'} dropUp={collapsed} />
      </div>
    </aside>
  );
}
