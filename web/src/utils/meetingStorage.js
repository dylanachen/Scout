const MEETING_PREFIX = 'scout_meeting_';
const SUMMARY_PREFIX = 'scout_meeting_summary_';

export function getMeetingSession(projectId) {
  if (projectId == null) return null;
  try {
    const raw = localStorage.getItem(`${MEETING_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setMeetingSession(projectId, data) {
  if (projectId == null) return;
  try {
    localStorage.setItem(`${MEETING_PREFIX}${projectId}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearMeetingSession(projectId) {
  if (projectId == null) return;
  try {
    localStorage.removeItem(`${MEETING_PREFIX}${projectId}`);
  } catch {
    /* ignore */
  }
}

export function getMeetingSummary(projectId) {
  if (projectId == null) return null;
  try {
    const raw = localStorage.getItem(`${SUMMARY_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setMeetingSummary(projectId, summary) {
  if (projectId == null) return;
  try {
    localStorage.setItem(`${SUMMARY_PREFIX}${projectId}`, JSON.stringify(summary));
  } catch {
    /* ignore */
  }
}

export function detectMeetingPlatform(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('zoom.us')) return 'zoom';
  if (u.includes('meet.google')) return 'meet';
  if (u.includes('teams.microsoft') || u.includes('teams.live')) return 'teams';
  return 'unknown';
}
