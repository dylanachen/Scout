import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

const UnreadContext = createContext(null);

function computeTotal(counts) {
  if (!counts || typeof counts !== 'object') return 0;
  let sum = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (k === '_total') continue;
    const n = Number(v);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

export function UnreadMessagesProvider({ children }) {
  const [counts, setCounts] = useState({});    // { projectIdStr: unreadCount }
  const timerRef = useRef(null);

  // Single source of truth — total is always derived from counts.
  const total = useMemo(() => computeTotal(counts), [counts]);

  const refresh = useCallback(async () => {
    if (isDemoMode()) {
      setCounts({});
      return;
    }
    try {
      const { data } = await api.get('/unread-counts');
      if (data && typeof data === 'object') {
        // Drop _total — we derive it ourselves so there's no way for it to go stale.
        const { _total, ...perProject } = data;
        setCounts(perProject);
      }
    } catch {
      setCounts({});
    }
  }, []);

  const markProjectRead = useCallback(async (projectId) => {
    if (projectId == null) return;
    const key = String(projectId);
    // Optimistic: zero out this project's count. total updates automatically via useMemo.
    setCounts((prev) => {
      if (!prev[key]) return prev;    // nothing to change
      const next = { ...prev };
      next[key] = 0;
      return next;
    });
    if (isDemoMode()) return;
    try {
      await api.post(`/projects/${projectId}/read`);
    } catch { /* swallow — next poll will reconcile */ }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = window.setInterval(refresh, 20000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh]);

  const value = { counts, total, refresh, markProjectRead };
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadContext);
  if (!ctx) {
    return { counts: {}, total: 0, refresh: () => {}, markProjectRead: () => {} };
  }
  return ctx;
}
