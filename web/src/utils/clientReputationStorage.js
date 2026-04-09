/** Local client reputation (demo / until API exists). Not shown to clients. */

const RATINGS_KEY = 'fos_client_ratings_v1';
const COMPLETED_KEY = 'fos_client_completed_projects_v1';
const COUNTED_PROJECTS_KEY = 'fos_client_completed_counted_projects_v1';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function clientKeyFromProject(project) {
  if (project?.client_id != null && String(project.client_id).trim()) return String(project.client_id).trim();
  const n = String(project?.client_name ?? 'unknown').trim().toLowerCase();
  return n.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'unknown';
}

function loadRatings() {
  return safeParse(typeof localStorage !== 'undefined' ? localStorage.getItem(RATINGS_KEY) : null, []);
}

function saveRatings(rows) {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function loadCompletedMap() {
  return safeParse(typeof localStorage !== 'undefined' ? localStorage.getItem(COMPLETED_KEY) : null, {});
}

function saveCompletedMap(m) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function hasSubmittedClientRatingForProject(projectId) {
  if (projectId == null) return false;
  const pid = String(projectId);
  return loadRatings().some((r) => String(r.projectId) === pid);
}

/**
 * @returns {{
 *   overall: number,
 *   assetDelivery: number,
 *   communication: number,
 *   scopeRespect: number,
 *   paymentSpeed: number,
 *   count: number
 * } | null}
 */
export function getAggregatedReputation(clientKey) {
  const key = String(clientKey ?? '').trim();
  if (!key) return null;
  const rows = loadRatings().filter((r) => String(r.clientKey) === key);
  if (rows.length === 0) return null;
  const avg = (field) => rows.reduce((s, r) => s + Number(r[field] ?? 0), 0) / rows.length;
  const assetDelivery = avg('assetDelivery');
  const communication = avg('communication');
  const scopeRespect = avg('scopeRespect');
  const paymentSpeed = avg('paymentSpeed');
  const overall = (assetDelivery + communication + scopeRespect + paymentSpeed) / 4;
  return {
    overall,
    assetDelivery,
    communication,
    scopeRespect,
    paymentSpeed,
    count: rows.length,
  };
}

export function getClientCompletedProjectCount(clientKey, seed = 0) {
  const key = String(clientKey ?? '').trim();
  const map = loadCompletedMap();
  const stored = Number(map[key]);
  const extra = Number.isFinite(stored) ? stored : 0;
  const base = Number(seed) || 0;
  return base + extra;
}

/** Call when a project is marked complete (once per project). Increments platform completed count for that client. */
export function recordClientProjectCompleted(projectId, clientKey) {
  const key = String(clientKey ?? '').trim();
  if (!key || projectId == null) return;
  const pid = String(projectId);
  const counted = new Set(safeParse(typeof localStorage !== 'undefined' ? localStorage.getItem(COUNTED_PROJECTS_KEY) : null, []));
  if (counted.has(pid)) return;
  counted.add(pid);
  try {
    localStorage.setItem(COUNTED_PROJECTS_KEY, JSON.stringify([...counted]));
  } catch {
    /* ignore */
  }
  const map = loadCompletedMap();
  map[key] = (Number(map[key]) || 0) + 1;
  saveCompletedMap(map);
  try {
    window.dispatchEvent(new CustomEvent('fos-reputation-updated'));
  } catch {
    /* ignore */
  }
}

export function submitClientRating({
  projectId,
  clientKey,
  assetDelivery,
  communication,
  scopeRespect,
  paymentSpeed,
  notes,
}) {
  const row = {
    projectId: projectId != null ? String(projectId) : '',
    clientKey: String(clientKey ?? '').trim(),
    assetDelivery: Math.min(5, Math.max(1, Number(assetDelivery) || 1)),
    communication: Math.min(5, Math.max(1, Number(communication) || 1)),
    scopeRespect: Math.min(5, Math.max(1, Number(scopeRespect) || 1)),
    paymentSpeed: Math.min(5, Math.max(1, Number(paymentSpeed) || 1)),
    notes: notes != null ? String(notes).trim() : '',
    at: new Date().toISOString(),
  };
  const prev = loadRatings().filter((r) => String(r.projectId) !== row.projectId);
  saveRatings([...prev, row]);
  try {
    window.dispatchEvent(new CustomEvent('fos-reputation-updated'));
  } catch {
    /* ignore */
  }
}
