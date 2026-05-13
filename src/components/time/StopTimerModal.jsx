import { useEffect, useState } from 'react';

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':');
}

export default function StopTimerModal({ open, projectName, elapsedMs, onConfirm, onCancel, onDiscard }) {
  const [description, setDescription] = useState('');
  const [planned, setPlanned] = useState(true);

  useEffect(() => {
    if (open) {
      setDescription('');
      setPlanned(true);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-timer-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(15, 22, 35, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--color-surface)',
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 50px rgba(15, 22, 35, 0.18)',
          padding: '22px 22px 18px',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="stop-timer-title" style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>
          Log time
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)' }}>
          {projectName ?? 'Project'} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDuration(elapsedMs)}</span>
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            resize: 'vertical',
            marginBottom: 14,
          }}
        />

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>Planned or unplanned?</div>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setPlanned(true)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: planned ? 'var(--color-primary)' : 'var(--color-surface)',
                color: planned ? '#fff' : 'var(--color-text-2)',
              }}
            >
              Planned
            </button>
            <button
              type="button"
              onClick={() => setPlanned(false)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: !planned ? '#ca8a04' : 'var(--color-surface)',
                color: !planned ? '#fff' : 'var(--color-text-2)',
              }}
            >
              Unplanned
            </button>
          </div>
        </div>

        {!planned && (
          <div
            style={{
              marginBottom: 18,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#fefce8',
              border: '1px solid #fcd34d',
              color: '#854d0e',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            This will count toward your scope drift tracking
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-2)',
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Keep running
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ description, planned })}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
