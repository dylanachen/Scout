/** Portfolio items + showcase permission requests (client). */

const PORTFOLIO_KEY = 'scout_portfolio_items_v1';
const PERM_KEY = 'scout_portfolio_permission_requests_v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getAllPortfolioItems() {
  return readJson(PORTFOLIO_KEY, []);
}

export function getPortfolioItemsForFreelancer(freelancerId) {
  const id = String(freelancerId);
  return getAllPortfolioItems().filter((x) => String(x.freelancerId) === id);
}

export function addPortfolioItem(item) {
  const list = getAllPortfolioItems();
  const row = {
    id: `pf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    ...item,
  };
  list.unshift(row);
  writeJson(PORTFOLIO_KEY, list);
  return row;
}

export function getPermissionRequests() {
  return readJson(PERM_KEY, []);
}

export function addPermissionRequest({ portfolioItemId, projectId, clientName, freelancerId }) {
  const list = getPermissionRequests();
  list.push({
    id: `perm_${Date.now()}`,
    portfolioItemId,
    projectId,
    clientName,
    freelancerId,
    at: new Date().toISOString(),
  });
  writeJson(PERM_KEY, list);
}
