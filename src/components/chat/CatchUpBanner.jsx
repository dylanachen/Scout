import { useState } from 'react';

export default function CatchUpBanner({ bullets, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);
  const items = bullets?.length
    ? bullets
    : ['Client asked about an extra hero variant.', 'You offered a change order.', 'Milestone 2 deadline is in 3 days.'];

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss?.(), 350);
  };

  return (
    <div
      style={{
        margin: '0 12px 12px',
        padding: '12px 14px',
        background: 'var(--color-catchup-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        flexShrink: 0,
        opacity: dismissing ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--color-text)' }}>
          Here&apos;s what you missed 👋
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
          {items.slice(0, 5).map((b, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Got it
      </button>
    </div>
  );
}
