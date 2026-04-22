import { useEffect, useRef, useState } from 'react';
import { lsRead, lsWrite } from '../utils/localStore';

export function useAutosaveDraft(key, initialValue, { delay = 400, enabled = true } = {}) {
  const [value, setValue] = useState(() => {
    if (!enabled) return initialValue;
    const stored = lsRead(key, null);
    return stored === null ? initialValue : stored;
  });
  const [savedAt, setSavedAt] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lsWrite(key, value);
      setSavedAt(new Date());
    }, delay);
    return () => window.clearTimeout(timer.current);
  }, [key, value, delay, enabled]);

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    setSavedAt(null);
  };

  return { value, setValue, savedAt, clear };
}
