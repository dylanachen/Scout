const ENTRIES_KEY = 'fos_time_entries_v1';
const SESSION_KEY = 'fos_time_session_v1';

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function getTimeEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const arr = safeParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setTimeEntries(entries) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function addTimeEntry(entry) {
  const cur = getTimeEntries();
  cur.push(entry);
  setTimeEntries(cur);
  return entry;
}

export function updateTimeEntry(id, patch) {
  const cur = getTimeEntries();
  const i = cur.findIndex((e) => e.id === id);
  if (i < 0) return null;
  cur[i] = { ...cur[i], ...patch };
  setTimeEntries(cur);
  return cur[i];
}

export function deleteTimeEntry(id) {
  const cur = getTimeEntries().filter((e) => e.id !== id);
  setTimeEntries(cur);
}

export function getTimerSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = safeParse(raw, null);
    if (!s || typeof s.projectId === 'undefined') return null;
    return s;
  } catch {
    return null;
  }
}

export function setTimerSession(session) {
  try {
    if (session == null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearTimerSession() {
  setTimerSession(null);
}
