import { Link } from 'react-router-dom';

export default function Onboarding() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Onboarding</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 24, lineHeight: 1.5 }}>
        Full-screen chat flows capture your profile. Legacy API chat is still available via{' '}
        <code style={{ fontSize: 12 }}>POST /onboarding/message</code> if you integrate the backend later.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link
          to="/onboarding/freelancer"
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Freelancer onboarding (full screen)
        </Link>
        <Link
          to="/onboarding/client"
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            textAlign: 'center',
            background: 'var(--color-surface)',
          }}
        >
          Client onboarding (full screen)
        </Link>
      </div>
    </div>
  );
}
