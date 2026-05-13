import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getFlag } from '../utils/featureFlags';

const DEFAULT_MINUTES = 15;
const WARNING_MS = 30_000;

export function useIdleLogout({ minutes = DEFAULT_MINUTES } = {}) {
  const { user, logout } = useAuth();
  const [warningLeft, setWarningLeft] = useState(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!user) return undefined;
    if (!getFlag('idleLogout')) return undefined;

    const timeoutMs = minutes * 60_000;

    function mark() {
      lastActivityRef.current = Date.now();
      if (warningLeft !== null) setWarningLeft(null);
    }

    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((evt) =>
      window.addEventListener(evt, mark, { passive: true }),
    );

    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= timeoutMs) {
        window.clearInterval(interval);
        setWarningLeft(null);
        try {
          logout?.();
        } catch {
          /* noop */
        }
        return;
      }
      if (idle >= timeoutMs - WARNING_MS) {
        setWarningLeft(Math.max(0, timeoutMs - idle));
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((evt) =>
        window.removeEventListener(evt, mark),
      );
    };
  }, [user, logout, minutes, warningLeft]);

  return { warningLeft };
}
