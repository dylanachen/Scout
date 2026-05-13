import { useMemo } from 'react';

function Bar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ background: 'var(--color-surface-3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: 'var(--color-primary)', height: '100%' }} />
    </div>
  );
}

const KEYS = [
  { id: 'skillFit', label: 'Skill fit' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'budget', label: 'Budget' },
  { id: 'communication', label: 'Communication' },
];

export default function MatchCompareModal({ matches, onClose }) {
  if (!matches || matches.length === 0) return null;
  return (
    <div
      className="scout-cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Compare matches"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: 22,
          width: 'min(720px, 94vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Compare matches</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-3)' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${matches.length}, 1fr)`, gap: 10, fontSize: 13 }}>
          <div />
          {matches.map((m) => (
            <div key={`h-${m.id}`} style={{ fontWeight: 700 }}>
              {m.name}
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{m.role}</div>
            </div>
          ))}

          <div style={{ color: 'var(--color-text-3)' }}>Overall</div>
          {matches.map((m) => (
            <div key={`o-${m.id}`} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.overallScore}</div>
          ))}

          {KEYS.map((k) => (
            <RowGroup key={k.id} label={k.label} matches={matches} keyName={k.id} />
          ))}

          <div style={{ color: 'var(--color-text-3)' }}>Location</div>
          {matches.map((m) => (
            <div key={`loc-${m.id}`}>{m.location || '—'}</div>
          ))}

          <div style={{ color: 'var(--color-text-3)' }}>Specialty</div>
          {matches.map((m) => (
            <div key={`sp-${m.id}`}>{m.specialty || '—'}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RowGroup({ label, matches, keyName }) {
  const values = useMemo(() => matches.map((m) => m.scores?.[keyName] ?? 0), [matches, keyName]);
  return (
    <>
      <div style={{ color: 'var(--color-text-3)' }}>{label}</div>
      {matches.map((m, i) => (
        <div key={`${keyName}-${m.id}`}>
          <div style={{ fontSize: 12, marginBottom: 3, fontVariantNumeric: 'tabular-nums' }}>{values[i]}</div>
          <Bar value={values[i]} />
        </div>
      ))}
    </>
  );
}
