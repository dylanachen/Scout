const PREFIX = 'fos_decisions_extra_';

export function getExtraDecisions(projectId) {
  if (projectId == null) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${projectId}`);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function appendExtraDecision(projectId, entry) {
  if (projectId == null) return;
  try {
    const cur = getExtraDecisions(projectId);
    cur.push(entry);
    localStorage.setItem(`${PREFIX}${projectId}`, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function removeExtraDecisionById(projectId, id) {
  if (projectId == null) return;
  try {
    const cur = getExtraDecisions(projectId).filter((e) => e.id !== id);
    localStorage.setItem(`${PREFIX}${projectId}`, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}
