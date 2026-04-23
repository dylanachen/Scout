const FACTORS = [
  { id: 'skillFit', label: 'Skill fit', desc: 'How well the required skills align with the freelancer profile.' },
  { id: 'timeline', label: 'Timeline', desc: 'Whether timing aligns with their current availability.' },
  { id: 'budget', label: 'Budget', desc: 'How close your budget is to their typical range.' },
  { id: 'communication', label: 'Communication', desc: 'Past clients rated their responsiveness and clarity.' },
];

export default function WhyThisMatchDrawer({ match, onClose }) {
  if (!match) return null;
  const scores = match.scores || {};
  return (
    <div
      className="scout-cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Why this match"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: 22,
          width: 'min(460px, 94vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Why this match?</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-3)' }}>×</button>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{match.name}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 14 }}>
          Overall score {match.overallScore}
        </div>

        {match.explanation ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 0 }}>{match.explanation}</p>
        ) : null}

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FACTORS.map((f) => {
            const score = scores[f.id] ?? 0;
            return (
              <li key={f.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-3)' }}>{score}</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: '100%', background: 'var(--color-primary)' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{f.desc}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
