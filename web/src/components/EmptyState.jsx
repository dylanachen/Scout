export default function EmptyState({
  illustration,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  style,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        minHeight: 260,
        ...style,
      }}
    >
      {illustration ?? <DefaultIllustration />}
      {title ? (
        <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0', color: 'var(--color-text)' }}>{title}</p>
      ) : null}
      {body ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px', maxWidth: 320, lineHeight: 1.5 }}>
          {body}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 8 }}>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {actionLabel}
          </button>
        ) : null}
        {onSecondary && secondaryLabel ? (
          <button
            type="button"
            onClick={onSecondary}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DefaultIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 160 140" fill="none" aria-hidden style={{ marginBottom: 4 }}>
      <ellipse cx="80" cy="118" rx="52" ry="10" fill="var(--color-surface-3)" opacity="0.6" />
      <rect x="46" y="36" width="68" height="64" rx="8" stroke="var(--color-border)" strokeWidth="2" fill="var(--color-surface)" />
      <line x1="56" y1="54" x2="104" y2="54" stroke="var(--color-surface-3)" strokeWidth="4" strokeLinecap="round" />
      <line x1="56" y1="68" x2="94" y2="68" stroke="var(--color-surface-3)" strokeWidth="4" strokeLinecap="round" />
      <line x1="56" y1="82" x2="86" y2="82" stroke="var(--color-surface-3)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
