import { Link } from 'react-router-dom';

export default function MetricCard({ label, value, hint, unit, hintColor, badge, href, onClick }) {
  const inner = (
    <>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>{unit}</span>}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: hintColor || 'var(--color-text-2)', marginTop: 8, fontWeight: hintColor ? 600 : 400 }}>
          {hint}
        </div>
      )}
      {badge != null && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
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
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  const cardStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '16px 18px',
    position: 'relative',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  };

  if (href) {
    return (
      <Link to={href} className="metric-card-link" style={cardStyle}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="metric-card-link"
        style={{ ...cardStyle, fontFamily: 'var(--font-sans)', textAlign: 'left', width: '100%', cursor: 'pointer' }}
      >
        {inner}
      </button>
    );
  }
  return <div style={cardStyle}>{inner}</div>;
}
