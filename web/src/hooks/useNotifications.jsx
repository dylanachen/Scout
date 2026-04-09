import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDashboardData } from './useDashboardData';
import { isDemoMode } from '../api/demoAdapter';
import { DEMO_NOTIFICATION_SEEDS } from '../data/demoNotifications';
import { normalizeNotification } from '../utils/notificationModel';

const STORAGE_KEY = 'fos-notifications-read-v1';

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

  const items = useMemo(() => {
    const raw = rawFromApi?.length ? rawFromApi : isDemoMode() ? DEMO_NOTIFICATION_SEEDS : [];
    const normalized = raw.map((r) => normalizeNotification(r));
    return normalized.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [rawFromApi]);

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
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      saveReadIds(next);
      return next;
    });
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
    document.title = unreadCount > 0 ? `(${unreadCount}) FreelanceOS` : 'FreelanceOS';
  }, [unreadCount]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
