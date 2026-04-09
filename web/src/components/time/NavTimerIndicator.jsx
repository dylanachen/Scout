import { useTimeTracking } from '../../hooks/useTimeTracking';

function formatHMS(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':');
}

export default function NavTimerIndicator() {
  const { session, elapsedMs, openTimerPanel } = useTimeTracking();
  if (!session) return null;

  const running = session.runningSince != null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 10,
        background: running ? 'rgba(29, 110, 205, 0.1)' : 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        maxWidth: 'min(420px, 100%)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: running ? '#16a34a' : '#ca8a04',
          flexShrink: 0,
        }}
        title={running ? 'Running' : 'Paused'}
        aria-hidden
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="9" stroke="var(--color-text-3)" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="var(--color-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <button
        type="button"
        onClick={() => openTimerPanel(session.projectId)}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text)',
          textAlign: 'left',
          minWidth: 0,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.projectName ?? 'Project'}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-2)' }}>{formatHMS(elapsedMs)}</span>
      </button>
    </div>
  );
}
