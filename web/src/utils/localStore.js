const listeners = new Map();

function emit(key) {
  const set = listeners.get(key);
  if (set) set.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent('scout-localstore', { detail: { key } }));
}

export function lsRead(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emit(key);
  } catch {
    /* ignore */
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
    emit(key);
  } catch {
    /* ignore */
  }
}

export function lsSubscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => {
    listeners.get(key)?.delete(fn);
  };
}
