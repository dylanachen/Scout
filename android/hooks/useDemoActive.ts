import { useEffect, useState } from 'react';
import { isDemoMode, shouldUseDemoAdapter } from '../api/demoAdapter';

export default function useDemoActive() {
  const [demoActive, setDemoActive] = useState(isDemoMode());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const enabled = await shouldUseDemoAdapter();
        if (!cancelled) setDemoActive(enabled);
      } catch {
        if (!cancelled) setDemoActive(isDemoMode());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return demoActive;
}
