const STORAGE_KEY = 'scout_feature_flags';

const DEFAULTS = {
  compactDensity: false,
  showMap: false,
  experimentalAnalytics: false,
  idleLogout: true,
};

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    window.dispatchEvent(new CustomEvent('scout-feature-flags'));
  } catch {
    /* ignore */
  }
}

export function getFlag(name) {
  const all = readAll();
  return all[name] ?? DEFAULTS[name];
}

export function setFlag(name, value) {
  const all = readAll();
  all[name] = value;
  writeAll(all);
}

export function allFlags() {
  return readAll();
}

export function resetFlags() {
  writeAll({ ...DEFAULTS });
}

export const FLAG_DEFAULTS = DEFAULTS;
