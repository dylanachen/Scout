import { useEffect, useRef, useState } from 'react';

const DOT = {
  joining: '#ea580c',
  active: '#16a34a',
  ended: '#9ca3af',
};

export default function MeetingBotBanner({ phase, onPressActive, onPressEnded, onEndSession }) {
  const [tipOpen, setTipOpen] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'active') setTipOpen(false);
  }, [phase]);

  useEffect(() => {
    const close = (e) => {
      if (bannerRef.current && !bannerRef.current.contains(e.target)) setTipOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!phase) return null;

  const label =
    phase === 'joining'
      ? 'AI agent joining your call…'
      : phase === 'active'
        ? 'AI agent is live'
        : 'Meeting ended — summary ready';

  const handleClick = () => {
    if (phase === 'active') {
      setTipOpen((v) => !v);
      onPressActive?.();
    } else if (phase === 'ended') {
      onPressEnded?.();
    }
  };

  const interactive = phase === 'active' || phase === 'ended';

  return (
    <div ref={bannerRef} style={{ position: 'relative', width: '100%' }}>
      <style>{`
        @keyframes fos-pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
      `}</style>
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border)',
          background: phase === 'ended' ? 'var(--color-surface-3)' : 'var(--color-surface)',
        }}
      >
        <button
          type="button"
          onClick={handleClick}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: 'none',
            background: 'none',
            cursor: interactive ? 'pointer' : 'default',
            fontFamily: 'var(--font-sans)',
            textAlign: 'left',
            padding: 0,
          }}
          aria-expanded={phase === 'active' ? tipOpen : undefined}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: DOT[phase] ?? DOT.ended,
              flexShrink: 0,
              boxShadow: phase === 'joining' ? '0 0 0 3px rgba(234, 88, 12, 0.25)' : 'none',
              animation: phase === 'active' ? 'fos-pulse-dot 1.5s ease-in-out infinite' : 'none',
            }}
            aria-hidden
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
          {phase === 'active' ? (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>Tap for details</span>
          ) : phase === 'ended' ? (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>Open summary</span>
          ) : null}
        </button>
        {phase === 'active' && (
          <button
            type="button"
            onClick={() => onEndSession?.()}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              flexShrink: 0,
            }}
          >
            End Session
          </button>
        )}
      </div>
      {tipOpen && phase === 'active' ? (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            top: '100%',
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--color-text)',
            color: '#fff',
            fontSize: 12,
            lineHeight: 1.45,
            zIndex: 40,
            boxShadow: '0 8px 24px rgba(15, 22, 35, 0.15)',
          }}
        >
          The AI is listening for scope, decisions, and action items
        </div>
      ) : null}
    </div>
  );
}
