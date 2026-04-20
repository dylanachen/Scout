import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';
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

const useBackend = () => !isDemoMode();

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
      if (e.key === 'scout_time_session_v1' || e.key === 'scout_time_entries_v1') {
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

  const refreshEntries = useCallback(async () => {
    if (useBackend()) {
      try {
        const { data } = await api.get('/time-entries');
        const mapped = (data || []).map((e) => ({
          id: `srv_${e.id}`,
          serverId: e.id,
          projectId: e.project_id,
          projectName: e.project_name,
          date: e.date,
          durationMinutes: e.duration_minutes,
          description: e.description || '',
          planned: false,
          source: 'server',
          createdAt: e.created_at,
        }));
        setEntries(mapped);
        setTimeEntries(mapped);
        return;
      } catch { /* fall through to local */ }
    }
    setEntries(getTimeEntries());
  }, []);

  useEffect(() => { refreshEntries(); }, [refreshEntries]);

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
    async ({ description, planned }) => {
      const s = getTimerSession();
      if (!s) { setStopModalOpen(false); return; }
      const ms = computeElapsedMs(s);
      const minutes = Math.max(1, Math.round(ms / 60000));
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const desc = String(description || '').trim() || 'Work session';

      if (useBackend() && s.projectId != null && Number.isFinite(Number(s.projectId))) {
        try {
          await api.post('/time-entries', {
            project_id: Number(s.projectId), date: dateStr,
            duration_minutes: minutes, description: desc, billable: true,
          });
        } catch { /* fall back to local */
          storageAddEntry({
            id: newId(), projectId: s.projectId, projectName: s.projectName,
            date: dateStr, durationMinutes: minutes, description: desc,
            planned: !!planned, source: 'timer', createdAt: new Date().toISOString(),
          });
        }
      } else {
        storageAddEntry({
          id: newId(), projectId: s.projectId, projectName: s.projectName,
          date: dateStr, durationMinutes: minutes, description: desc,
          planned: !!planned, source: 'timer', createdAt: new Date().toISOString(),
        });
      }
      await refreshEntries();
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
    async ({ projectId, projectName, date, durationMinutes, description, planned }) => {
      const minutes = Math.max(1, Number(durationMinutes) || 0);
      const desc = String(description || '').trim() || 'Manual entry';
      if (useBackend() && projectId != null && Number.isFinite(Number(projectId))) {
        try {
          await api.post('/time-entries', {
            project_id: Number(projectId), date, duration_minutes: minutes,
            description: desc, billable: true,
          });
          await refreshEntries();
          return;
        } catch { /* fall back */ }
      }
      storageAddEntry({
        id: newId(), projectId, projectName, date,
        durationMinutes: minutes, description: desc,
        planned: !!planned, source: 'manual', createdAt: new Date().toISOString(),
      });
      await refreshEntries();
    },
    [refreshEntries],
  );

  const updateEntry = useCallback(
    async (id, patch) => {
      if (useBackend() && typeof id === 'string' && id.startsWith('srv_')) {
        try {
          const sid = Number(id.slice(4));
          await api.patch(`/time-entries/${sid}`, {
            date: patch.date,
            duration_minutes: patch.durationMinutes,
            description: patch.description,
          });
          await refreshEntries();
          return;
        } catch { /* fall back */ }
      }
      storageUpdateEntry(id, patch);
      await refreshEntries();
    },
    [refreshEntries],
  );

  const deleteEntry = useCallback(
    async (id) => {
      if (useBackend() && typeof id === 'string' && id.startsWith('srv_')) {
        try {
          const sid = Number(id.slice(4));
          await api.delete(`/time-entries/${sid}`);
          await refreshEntries();
          return;
        } catch { /* fall back */ }
      }
      storageDeleteEntry(id);
      await refreshEntries();
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
