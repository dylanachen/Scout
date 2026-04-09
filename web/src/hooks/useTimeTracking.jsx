import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import {
  addTimeEntry as storageAddEntry,
  clearTimerSession,
  deleteTimeEntry as storageDeleteEntry,
  getTimeEntries,
  getTimerSession,
  setTimeEntries,
  setTimerSession,
  updateTimeEntry as storageUpdateEntry,
} from '../utils/timeTrackingStorage';

function newId() {
  return `te_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function computeElapsedMs(session, now = Date.now()) {
  if (!session) return 0;
  const base = Number(session.accumulatedMs) || 0;
  if (session.runningSince != null) {
    return base + (now - session.runningSince);
  }
  return base;
}

const TimeTrackingContext = createContext(null);

export function TimeTrackingProvider({ children }) {
  const [entries, setEntries] = useState(() => getTimeEntries());
  const [session, setSessionState] = useState(() => getTimerSession());
  const [tick, setTick] = useState(0);
  const [projects, setProjects] = useState([]);
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);
  const [panelDefaultProjectId, setPanelDefaultProjectId] = useState(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);

  const persistSession = useCallback((s) => {
    setSessionState(s);
    setTimerSession(s);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'fos_time_session_v1' || e.key === 'fos_time_entries_v1') {
        setSessionState(getTimerSession());
        setEntries(getTimeEntries());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!session || session.runningSince == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session?.runningSince, session]);

  const elapsedMs = useMemo(() => computeElapsedMs(session), [session, tick]);

  const refreshEntries = useCallback(() => setEntries(getTimeEntries()), []);

  const openTimerPanel = useCallback((projectId = null) => {
    setPanelDefaultProjectId(projectId);
    setTimerPanelOpen(true);
  }, []);

  const closeTimerPanel = useCallback(() => setTimerPanelOpen(false), []);

  const startTimer = useCallback(
    (projectId, projectName) => {
      const name = projectName ?? String(projectId);
      if (session && session.projectId === projectId && session.runningSince != null) return;
      if (session && session.projectId === projectId && session.runningSince == null) {
        persistSession({ ...session, projectName: name, runningSince: Date.now() });
        return;
      }
      persistSession({
        projectId,
        projectName: name,
        accumulatedMs: 0,
        runningSince: Date.now(),
      });
    },
    [session, persistSession],
  );

  const pauseTimer = useCallback(() => {
    if (!session || session.runningSince == null) return;
    const now = Date.now();
    const accumulatedMs = (Number(session.accumulatedMs) || 0) + (now - session.runningSince);
    persistSession({ ...session, accumulatedMs, runningSince: null });
  }, [session, persistSession]);

  const resumeTimer = useCallback(() => {
    if (!session || session.runningSince != null) return;
    persistSession({ ...session, runningSince: Date.now() });
  }, [session, persistSession]);

  const requestStop = useCallback(() => {
      const s = getTimerSession();
      if (!s) return;
      if (s.runningSince != null) {
        const now = Date.now();
        const accumulatedMs = (Number(s.accumulatedMs) || 0) + (now - s.runningSince);
        persistSession({ ...s, accumulatedMs, runningSince: null });
      }
      const ms = computeElapsedMs(getTimerSession());
      if (ms < 500) {
        persistSession(null);
        clearTimerSession();
        return;
      }
      setStopModalOpen(true);
  }, [persistSession]);

  const cancelStopModal = useCallback(() => {
    setStopModalOpen(false);
    const s = getTimerSession();
    if (s && s.runningSince == null && (Number(s.accumulatedMs) || 0) > 0) {
      persistSession({ ...s, runningSince: Date.now() });
    }
  }, [persistSession]);

  const confirmStop = useCallback(
    ({ description, planned }) => {
      const s = getTimerSession();
      if (!s) {
        setStopModalOpen(false);
        return;
      }
      const ms = computeElapsedMs(s);
      const minutes = Math.max(1, Math.round(ms / 60000));
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      storageAddEntry({
        id: newId(),
        projectId: s.projectId,
        projectName: s.projectName,
        date: dateStr,
        durationMinutes: minutes,
        description: String(description || '').trim() || 'Work session',
        planned: !!planned,
        source: 'timer',
        createdAt: new Date().toISOString(),
      });
      refreshEntries();
      persistSession(null);
      clearTimerSession();
      setStopModalOpen(false);
    },
    [persistSession, refreshEntries],
  );

  const discardSession = useCallback(() => {
    persistSession(null);
    clearTimerSession();
    setStopModalOpen(false);
  }, [persistSession]);

  const addManualEntry = useCallback(
    ({ projectId, projectName, date, durationMinutes, description, planned }) => {
      storageAddEntry({
        id: newId(),
        projectId,
        projectName,
        date,
        durationMinutes: Math.max(1, Number(durationMinutes) || 0),
        description: String(description || '').trim() || 'Manual entry',
        planned: !!planned,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
      refreshEntries();
    },
    [refreshEntries],
  );

  const updateEntry = useCallback(
    (id, patch) => {
      storageUpdateEntry(id, patch);
      refreshEntries();
    },
    [refreshEntries],
  );

  const deleteEntry = useCallback(
    (id) => {
      storageDeleteEntry(id);
      refreshEntries();
    },
    [refreshEntries],
  );

  const value = useMemo(
    () => ({
      entries,
      session,
      elapsedMs,
      projects,
      loadProjects,
      timerPanelOpen,
      panelDefaultProjectId,
      setTimerPanelOpen,
      openTimerPanel,
      closeTimerPanel,
      startTimer,
      pauseTimer,
      resumeTimer,
      requestStop,
      stopModalOpen,
      cancelStopModal,
      confirmStop,
      discardSession,
      addManualEntry,
      updateEntry,
      deleteEntry,
      refreshEntries,
    }),
    [
      entries,
      session,
      elapsedMs,
      projects,
      loadProjects,
      timerPanelOpen,
      panelDefaultProjectId,
      openTimerPanel,
      closeTimerPanel,
      startTimer,
      pauseTimer,
      resumeTimer,
      requestStop,
      stopModalOpen,
      cancelStopModal,
      confirmStop,
      discardSession,
      addManualEntry,
      updateEntry,
      deleteEntry,
      refreshEntries,
    ],
  );

  return <TimeTrackingContext.Provider value={value}>{children}</TimeTrackingContext.Provider>;
}

export function useTimeTracking() {
  const ctx = useContext(TimeTrackingContext);
  if (!ctx) throw new Error('useTimeTracking must be used within TimeTrackingProvider');
  return ctx;
}
