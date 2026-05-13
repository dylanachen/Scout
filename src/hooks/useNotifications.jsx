import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDashboardData } from './useDashboardData';
import { isDemoMode } from '../api/demoAdapter';
import { DEMO_NOTIFICATION_SEEDS } from '../data/demoNotifications';
import { normalizeNotification } from '../utils/notificationModel';
import { api } from '../api/client';

const STORAGE_KEY = 'scout-notifications-read-v1';

function loadReadIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { loading, err, notifications: rawFromApi } = useDashboardData();
  const [readIds, setReadIds] = useState(loadReadIds);
  const [backendItems, setBackendItems] = useState([]);

  // Pull backend notifications alongside the dashboard feed
  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!cancelled && Array.isArray(data)) {
          const mapped = data.map((n) => ({
            id: `be_${n.id}`,
            backendId: n.id,
            text: n.title + (n.body ? ` — ${n.body}` : ''),
            at: n.created_at,
            kind: n.kind,
            link: n.link,
            project_id: n.project_id,
            read_at: n.read_at,
          }));
          setBackendItems(mapped);
          // Pre-populate read ids from backend read_at markers so the badge respects them.
          setReadIds((prev) => {
            const next = new Set(prev);
            mapped.forEach((m) => { if (m.read_at) next.add(m.id); });
            saveReadIds(next);
            return next;
          });
        }
      } catch { /* non-fatal */ }
    };
    pull();
    const id = window.setInterval(pull, 45000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const items = useMemo(() => {
    const dashboardItems = rawFromApi?.length ? rawFromApi.map((r) => normalizeNotification(r)) : [];
    const beItems = backendItems.map((r) => normalizeNotification(r));
    const raw = beItems.length ? [...beItems, ...dashboardItems]
      : (dashboardItems.length ? dashboardItems : (isDemoMode() ? DEMO_NOTIFICATION_SEEDS.map((r) => normalizeNotification(r)) : []));
    return raw.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [rawFromApi, backendItems]);

  const isRead = useCallback((id) => readIds.has(String(id)), [readIds]);

  const unreadCount = useMemo(() => items.filter((n) => !readIds.has(n.id)).length, [items, readIds]);

  const markRead = useCallback((id) => {
    const sid = String(id);
    setReadIds((prev) => {
      if (prev.has(sid)) return prev;
      const next = new Set(prev);
      next.add(sid);
      saveReadIds(next);
      return next;
    });
    // Push to backend if this is a backend notification
    if (sid.startsWith('be_') && !isDemoMode()) {
      const backendId = sid.slice(3);
      api.post(`/notifications/${backendId}/read`).catch(() => { /* non-fatal */ });
    }
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      saveReadIds(next);
      return next;
    });
    if (!isDemoMode()) {
      api.post('/notifications/read-all').catch(() => { /* non-fatal */ });
    }
  }, [items]);

  const value = useMemo(
    () => ({
      loading,
      err,
      items,
      readIds,
      isRead,
      unreadCount,
      markRead,
      markAllRead,
    }),
    [loading, err, items, readIds, isRead, unreadCount, markRead, markAllRead],
  );

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Scout` : 'Scout';
  }, [unreadCount]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
