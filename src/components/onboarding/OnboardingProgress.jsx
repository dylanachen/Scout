export default function OnboardingProgress({ currentIndex, total }) {
  const pct = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  return (
    <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 999,
            background: 'var(--color-surface-3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 999,
              background: 'linear-gradient(90deg, var(--color-primary), #6366f1)',
              transition: 'width 0.35s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', minWidth: 44, textAlign: 'right' }}>
          {currentIndex + 1} of {total}
        </span>
      </div>
    </div>
  );
}
