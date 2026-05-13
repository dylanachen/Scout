import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

const UnreadContext = createContext(null);
const COUNTS_STORAGE_KEY = 'scout_unread_counts_v1';

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

function loadStoredCounts() {
  try {
    const raw = localStorage.getItem(COUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function persistCounts(counts) {
  try {
    localStorage.setItem(COUNTS_STORAGE_KEY, JSON.stringify(counts ?? {}));
  } catch { /* ignore */ }
}

export function UnreadMessagesProvider({ children }) {
  const [counts, setCounts] = useState(loadStoredCounts);    // { projectIdStr: unreadCount }
  const countsRef = useRef(counts);
  const timerRef = useRef(null);

  // Persist whenever counts change so reads survive a page refresh
  // (critical in demo mode; harmless in real mode since refresh() reseeds from server).
  useEffect(() => {
    countsRef.current = counts;
    persistCounts(counts);
  }, [counts]);

  // Single source of truth — total is always derived from counts.
  const total = useMemo(() => computeTotal(counts), [counts]);

  const refresh = useCallback(async () => {
    if (isDemoMode()) {
      // In demo there's no server-side counts; preserve any local optimistic updates
      // (markProjectRead writes) so unread badges actually clear after reading a chat.
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
    // Optimistic: zero out this project's count. Always write so consumers can detect "read"
    // even when the server-side count was never seeded (e.g. demo mode). Total updates via useMemo.
    setCounts((prev) => {
      if (prev[key] === 0) return prev;
      return { ...prev, [key]: 0 };
    });
    if (isDemoMode()) return;
    try {
      await api.post(`/projects/${projectId}/read`);
    } catch { /* swallow — next poll will reconcile */ }
  }, []);

  const markAllProjectsRead = useCallback(async (projectIds) => {
    // Union of every id the server-side counts know about (so invited projects are
    // included — the dashboard-summary feed only lists owned ones) and any extras
    // the caller wants zeroed (helps demo mode where `counts` may be empty).
    const fromCounts = Object.keys(countsRef.current ?? {});
    const fromArg = Array.isArray(projectIds) ? projectIds.map((id) => String(id)) : [];
    const allIds = Array.from(new Set([...fromCounts, ...fromArg]));

    setCounts((prev) => {
      const next = { ...prev };
      for (const id of allIds) next[id] = 0;
      return next;
    });
    if (isDemoMode()) return;
    if (allIds.length) {
      await Promise.all(
        allIds.map((id) => api.post(`/projects/${id}/read`).catch(() => {})),
      );
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = window.setInterval(refresh, 20000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh]);

  const value = { counts, total, refresh, markProjectRead, markAllProjectsRead };
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadContext);
  if (!ctx) {
    return {
      counts: {},
      total: 0,
      refresh: () => {},
      markProjectRead: () => {},
      markAllProjectsRead: () => {},
    };
  }
  return ctx;
}
