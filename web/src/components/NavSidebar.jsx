import { NavLink } from 'react-router-dom';
import UserNavMenu from './UserNavMenu';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: isActive ? '0 10px 10px 0' : 10,
  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
  fontSize: 13,
  fontWeight: 600,
  color: isActive ? 'var(--color-primary)' : 'var(--color-text-2)',
  background: isActive ? 'rgba(29, 110, 205, 0.08)' : 'transparent',
  textDecoration: 'none',
});

function NavIcon({ children }) {
  return (
    <span style={{ width: 20, display: 'inline-flex', justifyContent: 'center', opacity: 0.85 }} aria-hidden>
      {children}
    </span>
  );
}

export default function NavSidebar() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="nav-sidebar">
      <div style={{ padding: '16px 14px 18px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em' }}>Scout</div>
      </div>
      <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        <NavLink to="/" end style={linkStyle}>
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              Dashboard
            </>
          )}
        </NavLink>
        <NavLink to="/projects" style={linkStyle}>
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              Projects
            </>
          )}
        </NavLink>
        <NavLink to="/matches" style={linkStyle}>
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="9" r="3.5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="15" cy="15" r="3.5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </NavIcon>
              Matches
            </>
          )}
        </NavLink>
        <NavLink to="/notifications" style={linkStyle}>
          {({ isActive }) => (
            <>
              <NavIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </NavIcon>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Notifications
                {unreadCount > 0 ? (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 9,
                      background: 'var(--color-danger)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </span>
            </>
          )}
        </NavLink>
        <NavLink to="/settings" style={linkStyle}>
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
              Settings
            </>
          )}
        </NavLink>
      </nav>
      <div style={{ padding: '12px 14px 16px', borderTop: '1px solid var(--color-border)' }}>
        <UserNavMenu variant="sidebar" />
      </div>
    </aside>
  );
}
