/** Local overrides when backend has no PATCH yet (e.g. demo). */

export function getLocalProjectStatus(projectId) {
  if (projectId == null) return null;
  try {
    return localStorage.getItem(`scout_project_status_${projectId}`);
  } catch {
    return null;
  }
}

export function setLocalProjectStatus(projectId, status) {
  if (projectId == null) return;
  try {
    localStorage.setItem(`scout_project_status_${projectId}`, String(status));
  } catch {
    /* ignore */
  }
}

export function mergeProjectStatus(project) {
  const local = getLocalProjectStatus(project?.id);
  if (!local) return project;
  return { ...project, status: local };
}
