import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const categories = [
  { to: '/settings/notifications', title: 'Notifications', description: 'In-app and email alerts' },
  { to: '/settings/scope-guardian', title: 'Scope Guardian', description: 'How strictly we flag out-of-scope work' },
  { to: '/settings/rates-pricing', title: 'Rates & Pricing', description: 'Defaults for quotes and invoices' },
  { to: '/settings/communication', title: 'Communication Preferences', description: 'How you like to work with clients' },
  { to: '/settings/account', title: 'Account', description: 'Profile, password, and security' },
];

function rowStyle() {
  return {
    display: 'block',
    padding: '16px 18px',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background 0.12s ease',
  };
}

export default function SettingsHome() {
  const { user } = useAuth();
  const name = user?.name?.trim() || '—';
  const email = user?.email?.trim() || '—';
  const initial = (name && name !== '—') ? name[0].toUpperCase() : '?';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--color-text-2)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <span aria-hidden>←</span> Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>Settings</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 28 }}>
        Manage notifications, billing defaults, and how Scout works for you.
      </p>

      <Link
        to="/settings/account"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          textDecoration: 'none',
          color: 'inherit',
          marginBottom: 20,
          transition: 'background 0.12s ease',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', wordBreak: 'break-all' }}>{email}</div>
        </div>
        <span style={{ color: 'var(--color-text-3)', flexShrink: 0 }} aria-hidden>→</span>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((c) => (
          <Link key={c.to} to={c.to} style={rowStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{c.description}</div>
              </div>
              <span style={{ color: 'var(--color-text-3)', flexShrink: 0 }} aria-hidden>
                →
              </span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
