/** @typedef {'in_progress' | 'awaiting_approval' | 'overdue' | 'completed' | 'pending_match'} ProjectStatus */

export const STATUS_STYLES = {
  in_progress: { label: 'In progress', bg: '#dcfce7', color: '#166534', border: '#86efac' },
  awaiting_approval: { label: 'Awaiting approval', bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  overdue: { label: 'Overdue', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  completed: { label: 'Completed', bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  pending_match: { label: 'Pending Match', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
};

export function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(user) {
  const raw = String(user?.name ?? '').trim();
  if (raw) return raw.split(/\s+/)[0];
  const email = String(user?.email ?? '').trim();
  if (email && email.includes('@')) return email.split('@')[0];
  return 'there';
}

export function formatShortDate(d) {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
  } catch {
    return d.toDateString();
  }
}

export function daysUntil(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

export function formatCurrencyFromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n / 100);
}

export function formatDeadlineDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function normalizeProject(p, viewerRole) {
  const role = viewerRole === 'client' ? 'client' : 'freelancer';
  const status = p.status && STATUS_STYLES[p.status] ? p.status : 'in_progress';
  return {
    id: String(p.id),
    name: p.name ?? 'Untitled',
    client_name: p.client_name ?? null,
    client_id: p.client_id != null ? String(p.client_id) : null,
    freelancer_name: p.freelancer_name ?? null,
    status,
    milestone_index: Number(p.milestone_index ?? p.milestoneIndex ?? 1) || 1,
    milestone_total: Number(p.milestone_total ?? p.milestoneTotal ?? 1) || 1,
    next_deadline: p.next_deadline ?? p.nextDeadline ?? null,
    unread_count: Number(p.unread_count ?? p.unreadCount ?? 0) || 0,
    viewer_role: role,
  };
}
