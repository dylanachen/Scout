export default function Skeleton({ width = '100%', height = 14, radius = 8, style, className }) {
  return (
    <span
      aria-hidden
      className={`scout-skeleton ${className || ''}`.trim()}
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function SkeletonBlock({ lines = 3, gap = 10, lastWidth = '60%', style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? lastWidth : '100%'} height={12} />
      ))}
    </div>
  );
}

export function SkeletonCard({ style }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        background: 'var(--color-surface)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} radius={20} />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={12} />
          <div style={{ height: 6 }} />
          <Skeleton width="70%" height={10} />
        </div>
      </div>
      <SkeletonBlock lines={2} />
    </div>
  );
}
