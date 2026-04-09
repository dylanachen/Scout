import { useId, useState } from 'react';

function formatOne(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(1);
}

function tierColor(overall) {
  const o = Number(overall);
  if (!Number.isFinite(o)) return { bg: 'var(--color-surface-3)', fg: 'var(--color-text-2)', border: 'var(--color-border)' };
  if (o >= 4.5) return { bg: '#ecfdf3', fg: '#15803d', border: '#86efac' };
  if (o >= 3) return { bg: '#fefce8', fg: '#a16207', border: '#fde047' };
  return { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' };
}

function buildTooltipLines(rep) {
  if (!rep) return '';
  return [
    `Asset delivery: ${formatOne(rep.assetDelivery)} / 5`,
    `Communication: ${formatOne(rep.communication)} / 5`,
    `Scope respect: ${formatOne(rep.scopeRespect)} / 5`,
    `Payment speed: ${formatOne(rep.paymentSpeed)} / 5`,
    `Based on ${rep.count} ${rep.count === 1 ? 'rating' : 'ratings'} (freelancers only; private)`,
  ].join('\n');
}

/**
 * @param {{
 *   reputation: { overall: number, assetDelivery: number, communication: number, scopeRespect: number, paymentSpeed: number, count: number } | null,
 *   completedProjectsCount: number,
 *   compact?: boolean,
 * }} props
 */
export default function ClientReputationBadge({ reputation, completedProjectsCount, compact }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const showNew =
    !reputation && Number(completedProjectsCount) < 3;

  if (!reputation && !showNew) return null;

  if (showNew) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: compact ? '2px 6px' : '3px 8px',
          borderRadius: 6,
          background: 'var(--color-surface-3)',
          color: 'var(--color-text-3)',
          border: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        New client
      </span>
    );
  }

  const o = reputation.overall;
  const colors = tierColor(o);
  const tooltip = buildTooltipLines(reputation);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        type="button"
        aria-describedby={tipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        title={tooltip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          padding: compact ? '2px 7px' : '3px 9px',
          borderRadius: 8,
          background: colors.bg,
          color: colors.fg,
          border: `1px solid ${colors.border}`,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.2,
        }}
      >
        <span aria-hidden style={{ letterSpacing: '-0.06em' }}>
          ★
        </span>
        <span>{formatOne(o)}</span>
        <span style={{ fontSize: compact ? 9 : 10, fontWeight: 600, opacity: 0.75 }}>
          &middot; {completedProjectsCount} {compact ? 'proj' : (completedProjectsCount === 1 ? 'project' : 'projects')}
        </span>
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 50,
            left: 0,
            top: '100%',
            marginTop: 6,
            minWidth: 220,
            maxWidth: 280,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 24px rgba(15, 22, 35, 0.12)',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-2)',
            whiteSpace: 'pre-line',
            lineHeight: 1.45,
            pointerEvents: 'none',
          }}
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
