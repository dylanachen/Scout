import { useEffect, useMemo, useState } from 'react';
import { useTimeTracking } from '../../hooks/useTimeTracking';

function formatHMS(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, '0')).join(':');
}

export default function TimerWidget({ defaultProjectId }) {
  const { projects, session, elapsedMs, startTimer, pauseTimer, resumeTimer, requestStop } = useTimeTracking();

  const options = useMemo(() => {
    return (projects ?? []).map((p) => ({ id: String(p.id), name: p.name ?? `Project ${p.id}` }));
  }, [projects]);

  const [selectedId, setSelectedId] = useState(() => defaultProjectId ?? '');

  useEffect(() => {
    if (session?.projectId != null) {
      setSelectedId(String(session.projectId));
      return;
    }
    if (defaultProjectId != null) setSelectedId(String(defaultProjectId));
  }, [session?.projectId, defaultProjectId]);

  useEffect(() => {
    if (!selectedId && options[0]) setSelectedId(String(options[0].id));
  }, [options, selectedId]);

  const nameFor = (id) => options.find((o) => o.id === String(id))?.name ?? id;
  const running = session?.runningSince != null;

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        background: 'var(--color-surface)',
        padding: '12px 14px',
        boxShadow: '0 8px 28px rgba(15, 22, 35, 0.08)',
        minWidth: 260,
        maxWidth: 320,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-3)',
          marginBottom: 8,
        }}
      >
        Timer
      </div>
      <select
        aria-label="Project"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={!!session}
        style={{
          width: '100%',
          marginBottom: 10,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          background: 'var(--color-surface)',
        }}
      >
        {options.length === 0 ? <option value="">No projects</option> : null}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          textAlign: 'center',
          marginBottom: 12,
          color: 'var(--color-text)',
        }}
      >
        {formatHMS(session ? elapsedMs : 0)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {!session ? (
          <button
            type="button"
            onClick={() => selectedId && startTimer(selectedId, nameFor(selectedId))}
            disabled={!selectedId}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: selectedId ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
              opacity: selectedId ? 1 : 0.5,
            }}
          >
            Start
          </button>
        ) : null}
        {session && running ? (
          <button
            type="button"
            onClick={() => pauseTimer()}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#ca8a04',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Pause
          </button>
        ) : null}
        {session && !running ? (
          <button
            type="button"
            onClick={() => resumeTimer()}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)',
              background: 'var(--color-surface)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Resume
          </button>
        ) : null}
        {session ? (
          <button
            type="button"
            onClick={() => requestStop()}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
}
