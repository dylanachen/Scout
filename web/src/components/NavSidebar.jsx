import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const linkStyle = ({ isActive }) => ({
  display: 'block',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: isActive ? 'var(--color-primary)' : 'var(--color-text-2)',
  background: isActive ? 'rgba(29, 110, 205, 0.08)' : 'transparent',
  textDecoration: 'none',
});

export default function NavSidebar({ mobileOpen, onClose }) {
  const { logout, user } = useAuth();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,22,35,0.35)',
            border: 'none',
            zIndex: 998,
          }}
          className="nav-backdrop"
        />
      )}
      <aside
        style={{
          width: 220,
          height: '100vh',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 999,
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
        className={`nav-sidebar${mobileOpen ? ' nav-sidebar--open' : ''}`}
      >
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>FreelanceOS</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
            {user?.email ?? user?.name ?? 'Signed in'}
          </div>
        </div>
        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/" end style={linkStyle} onClick={onClose}>
            Dashboard
          </NavLink>
          <NavLink to="/chat" style={linkStyle} onClick={onClose}>
            Project chat
          </NavLink>
          <NavLink to="/onboarding" style={linkStyle} onClick={onClose}>
            Onboarding
          </NavLink>
          <NavLink to="/invoices" style={linkStyle} onClick={onClose}>
            Invoices
          </NavLink>
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => {
              logout();
              onClose?.();
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
