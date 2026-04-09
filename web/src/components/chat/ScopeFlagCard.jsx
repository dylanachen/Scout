import { useState } from 'react';

const CHIPS_DEFAULT = [
  'Happy to take a look — let me check what\'s in scope first',
  'That falls outside our current agreement — I can send a change order',
  'I\'d love to add that — let me put together a quick change order for you',
];

const SEVERITY_STYLES = {
  LOW: { color: 'var(--color-severity-low)', bg: 'var(--color-severity-low-bg)' },
  MEDIUM: { color: 'var(--color-severity-med)', bg: 'var(--color-severity-med-bg)' },
  HIGH: { color: 'var(--color-severity-high)', bg: 'var(--color-severity-high-bg)' },
};

/**
 * Private scope flag — freelancer-only card (not a standard bubble).
 */
export default function ScopeFlagCard({ alert, onDismiss, onChipTap }) {
  const [dismissing, setDismissing] = useState(false);
  const severity = (alert.severity || 'MEDIUM').toUpperCase();
  const sev = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.MEDIUM;
  const explanation =
    alert.explanation ||
    alert.message ||
    'This request may be outside your agreed scope — review your contract before committing.';
  const clause = alert.contract_clause || alert.contractClause;
  let chips = CHIPS_DEFAULT;
  if (Array.isArray(alert.suggested_chips) && alert.suggested_chips.length) {
    chips = alert.suggested_chips;
  } else if (alert.suggested_reply) {
    chips = [alert.suggested_reply, ...CHIPS_DEFAULT.slice(1)];
  }

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss?.(alert.id), 350);
  };

  return (
    <div
      style={{
        margin: '8px 0',
        padding: dismissing ? 0 : '14px 14px 12px',
        background: 'var(--color-scope-bg)',
        border: '1px solid var(--color-scope-border)',
        borderRadius: 12,
        position: 'relative',
        maxWidth: 'min(100%, 420px)',
        opacity: dismissing ? 0 : 1,
        maxHeight: dismissing ? 0 : 600,
        overflow: 'hidden',
        transition: 'opacity 0.3s ease, max-height 0.35s ease, padding 0.35s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ opacity: 0.75, flexShrink: 0 }} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>Scope Flag</div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: 6,
              color: sev.color,
              background: sev.bg,
            }}
          >
            {severity}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)', margin: '0 0 12px' }}>{explanation}</p>

      {clause ? (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
            color: 'var(--color-text-2)',
          }}
        >
          {clause}
        </div>
      ) : null}

      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8 }}>
        How do you want to respond?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chips.slice(0, 3).map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChipTap?.(text)}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.45,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary)',
            }}
          >
            {text}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-sans)',
            padding: 4,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
