const BOOKMARK_KEY = 'scout_bookmarked_project_ids';

export function getBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveBookmarks(ids) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore local storage failures */
  }
}
