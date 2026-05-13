import { NavLink } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';

const tabStyle = ({ isActive }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '6px 2px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: isActive ? 'var(--color-primary)' : 'var(--color-text-3)',
  textDecoration: 'none',
  minWidth: 0,
  WebkitTapHighlightColor: 'transparent',
  transition: 'color 0.15s ease',
});

function IconHome({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        fill={active ? 'var(--color-primary)' : 'none'}
        stroke={active ? 'var(--color-primary)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFolder({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        fill={active ? 'var(--color-primary)' : 'none'}
        stroke={active ? 'var(--color-primary)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMatch({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="4" fill={active ? 'var(--color-primary)' : 'none'} stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.6" />
      <circle cx="15" cy="15" r="4" fill={active ? 'var(--color-primary)' : 'none'} stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.6" />
    </svg>
  );
}

function IconBell({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z"
        fill={active ? 'var(--color-primary)' : 'none'}
        stroke={active ? 'var(--color-primary)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInvite({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" fill={active ? 'var(--color-primary)' : 'none'} stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.6" />
      <path d="M3 7l9 6 9-6" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function IconGear({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00-.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .55.22 1.05.59 1.41.36.37.86.59 1.41.59H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        fill={active ? 'var(--color-primary)' : 'none'}
        stroke={active ? 'var(--color-primary)' : 'currentColor'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill={active ? 'var(--color-surface)' : 'none'}
        stroke={active ? 'var(--color-primary)' : 'currentColor'}
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function MobileTabBar() {
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <nav className="mobile-tab-bar" aria-label="Main">
      <NavLink to="/" end style={tabStyle}>
        {({ isActive }) => (
          <>
            <IconHome active={isActive} />
            <span>Dashboard</span>
          </>
        )}
      </NavLink>
      <NavLink to="/projects" style={tabStyle}>
        {({ isActive }) => (
          <>
            <IconFolder active={isActive} />
            <span>Projects</span>
          </>
        )}
      </NavLink>
      {isClient ? (
        <NavLink to="/matches" style={tabStyle}>
          {({ isActive }) => (
            <>
              <IconMatch active={isActive} />
              <span>Matches</span>
            </>
          )}
        </NavLink>
      ) : (
        <NavLink to="/invitations" style={tabStyle}>
          {({ isActive }) => (
            <>
              <IconInvite active={isActive} />
              <span>Invitations</span>
            </>
          )}
        </NavLink>
      )}
      <NavLink to="/notifications" style={(props) => ({ ...tabStyle(props), position: 'relative' })}>
        {({ isActive }) => (
          <>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <IconBell active={isActive} />
              {unreadCount > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -7,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: 'var(--color-danger)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    boxShadow: '0 0 0 2px var(--color-surface)',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </span>
            <span style={{ textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Alerts</span>
          </>
        )}
      </NavLink>
      <NavLink to="/settings" style={tabStyle}>
        {({ isActive }) => (
          <>
            <IconGear active={isActive} />
            <span>Settings</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
