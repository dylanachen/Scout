export default function MetricCard({ label, value, hint }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '16px 18px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}>{value}</div>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 8 }}>{hint}</div>
      )}
    </div>
  );
}
