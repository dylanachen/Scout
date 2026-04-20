export function ScoutLogo({ centered }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered ? 'center' : 'flex-start',
        gap: 10,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          background: 'var(--color-primary)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
          color: '#fff',
          letterSpacing: '-0.5px',
        }}
      >
        S
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Scout</div>
    </div>
  );
}

export default function AuthPageLayout({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'var(--color-surface-2)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 420,
        }}
      >
        {children}
      </div>
    </div>
  );
}
