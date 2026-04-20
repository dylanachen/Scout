import { useEffect, useState } from 'react';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import TimerWidget from './TimerWidget';

export default function TimeTrackingFloatingPanel() {
  const { timerPanelOpen, closeTimerPanel, panelDefaultProjectId } = useTimeTracking();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const fn = () => setIsMobile(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  if (!timerPanelOpen) return null;

  const bottom = isMobile ? 152 : 108;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      <button
        type="button"
        onClick={closeTimerPanel}
        aria-label="Close timer"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
          color: 'var(--color-text-2)',
          boxShadow: '0 4px 16px rgba(15, 22, 35, 0.1)',
        }}
      >
        ×
      </button>
      <TimerWidget defaultProjectId={panelDefaultProjectId} />
    </div>
  );
}
