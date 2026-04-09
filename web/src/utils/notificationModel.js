/** @typedef {'match'|'message'|'scope'|'decision'|'milestone'|'invoice_viewed'|'change_order'|'meeting_summary'|'variance'|'asset_reminder'} NotificationType */

export const NOTIFICATION_TYPES = {
  MATCH: 'match',
  MESSAGE: 'message',
  SCOPE: 'scope',
  DECISION: 'decision',
  MILESTONE: 'milestone',
  INVOICE_VIEWED: 'invoice_viewed',
  CHANGE_ORDER: 'change_order',
  MEETING_SUMMARY: 'meeting_summary',
  VARIANCE: 'variance',
  ASSET_REMINDER: 'asset_reminder',
};

/** @type {Record<string, 'all'|'unread'|'scope'|'invoices'|'messages'|'meetings'>} */
export const FILTER_TABS = {
  ALL: 'all',
  UNREAD: 'unread',
  SCOPE: 'scope',
  INVOICES: 'invoices',
  MESSAGES: 'messages',
  MEETINGS: 'meetings',
};

/**
 * @param {string} iso
 * @returns {string}
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((dayStart(new Date(now)) - dayStart(d)) / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return '';
  }
}

/**
 * Infer type from legacy API text when needed.
 * @param {string} text
 * @returns {NotificationType}
 */
function inferTypeFromText(text) {
  const s = String(text).toLowerCase();
  if (s.includes('match')) return NOTIFICATION_TYPES.MATCH;
  if (s.includes('message') || s.includes('chat')) return NOTIFICATION_TYPES.MESSAGE;
  if (s.includes('scope') || s.includes('flag')) return NOTIFICATION_TYPES.SCOPE;
  if (s.includes('decision')) return NOTIFICATION_TYPES.DECISION;
  if (s.includes('milestone')) return NOTIFICATION_TYPES.MILESTONE;
  if (s.includes('invoice')) return NOTIFICATION_TYPES.INVOICE_VIEWED;
  if (s.includes('change order')) return NOTIFICATION_TYPES.CHANGE_ORDER;
  if (s.includes('meeting') || s.includes('summary')) return NOTIFICATION_TYPES.MEETING_SUMMARY;
  if (s.includes('asset') || s.includes('reminder')) return NOTIFICATION_TYPES.ASSET_REMINDER;
  if (s.includes('variance') || s.includes('time')) return NOTIFICATION_TYPES.VARIANCE;
  return NOTIFICATION_TYPES.MESSAGE;
}

/**
 * @param {object} raw
 * @param {string} raw.id
 * @param {NotificationType} [raw.type]
 * @param {string} [raw.title]
 * @param {string} [raw.description]
 * @param {string} [raw.text]
 * @param {string} [raw.at]
 * @param {string} [raw.created_at]
 * @param {string} [raw.projectId]
 * @param {object} [raw.navigate]
 */
export function normalizeNotification(raw) {
  const at = raw.at ?? raw.created_at ?? new Date().toISOString();
  const text = raw.text ?? '';
  const type = raw.type ?? inferTypeFromText(text);
  const title =
    raw.title ??
    (type === NOTIFICATION_TYPES.MATCH
      ? 'New match available'
      : type === NOTIFICATION_TYPES.MESSAGE
        ? 'New message in chat'
        : type === NOTIFICATION_TYPES.SCOPE
          ? 'Scope flag raised'
          : type === NOTIFICATION_TYPES.DECISION
            ? 'Decision logged'
            : type === NOTIFICATION_TYPES.MILESTONE
              ? 'Milestone due'
              : type === NOTIFICATION_TYPES.INVOICE_VIEWED
                ? 'Invoice viewed by client'
                : type === NOTIFICATION_TYPES.CHANGE_ORDER
                  ? 'Change order signed'
                  : type === NOTIFICATION_TYPES.MEETING_SUMMARY
                    ? 'Meeting summary ready'
                    : type === NOTIFICATION_TYPES.VARIANCE
                      ? 'Variance alert'
                      : type === NOTIFICATION_TYPES.ASSET_REMINDER
                        ? 'Asset reminder'
                        : 'Notification');
  const description = raw.description ?? (text && text !== title ? text : defaultDescription(type, raw));
  const projectId = raw.projectId != null ? String(raw.projectId) : undefined;
  const navigate = raw.navigate ?? defaultNavigate(type, projectId);

  return {
    id: String(raw.id),
    type,
    title,
    description,
    at,
    projectId,
    navigate,
  };
}

function defaultDescription(type, raw) {
  const pid = raw.projectId != null ? `Project ${raw.projectId}` : 'Your project';
  switch (type) {
    case NOTIFICATION_TYPES.MATCH:
      return 'A client is looking for skills that fit your profile.';
    case NOTIFICATION_TYPES.MESSAGE:
      return `${pid} has a new message in chat.`;
    case NOTIFICATION_TYPES.SCOPE:
      return 'A scope flag was raised — review the drift report.';
    case NOTIFICATION_TYPES.DECISION:
      return 'A decision was logged in the project chat.';
    case NOTIFICATION_TYPES.MILESTONE:
      return 'A milestone deadline is approaching.';
    case NOTIFICATION_TYPES.INVOICE_VIEWED:
      return 'The client opened your invoice.';
    case NOTIFICATION_TYPES.CHANGE_ORDER:
      return 'The change order has been signed.';
    case NOTIFICATION_TYPES.MEETING_SUMMARY:
      return 'Your meeting recap is ready to review.';
    case NOTIFICATION_TYPES.VARIANCE:
      return 'Time logged differs from the plan — check variance.';
    case NOTIFICATION_TYPES.ASSET_REMINDER:
      return 'A project asset is still pending — follow up with the client.';
    default:
      return raw.text || 'Open for details.';
  }
}

function defaultNavigate(type, projectId) {
  const pid = projectId ?? 'demo-p1';
  switch (type) {
    case NOTIFICATION_TYPES.MATCH:
      return { path: '/matches' };
    case NOTIFICATION_TYPES.MESSAGE:
      return { path: '/chat', state: { projectId: pid } };
    case NOTIFICATION_TYPES.SCOPE:
      return { path: `/projects/${pid}/scope-drift` };
    case NOTIFICATION_TYPES.DECISION:
      return { path: '/chat', state: { projectId: pid } };
    case NOTIFICATION_TYPES.MILESTONE:
      return { path: '/projects' };
    case NOTIFICATION_TYPES.INVOICE_VIEWED:
      return { path: '/invoices' };
    case NOTIFICATION_TYPES.CHANGE_ORDER:
      return { path: `/projects/${pid}/change-order` };
    case NOTIFICATION_TYPES.MEETING_SUMMARY:
      return { path: `/projects/${pid}/meeting-summary` };
    case NOTIFICATION_TYPES.VARIANCE:
      return { path: '/time/week' };
    case NOTIFICATION_TYPES.ASSET_REMINDER:
      return { path: '/chat', state: { projectId: pid } };
    default:
      return { path: '/notifications' };
  }
}

/**
 * @param {{ type: string }} n
 * @param {string} filter
 */
export function notificationMatchesFilter(n, filter) {
  if (filter === FILTER_TABS.ALL || filter === FILTER_TABS.UNREAD) return true;
  if (filter === FILTER_TABS.SCOPE)
    return n.type === NOTIFICATION_TYPES.SCOPE || n.type === NOTIFICATION_TYPES.ASSET_REMINDER;
  if (filter === FILTER_TABS.INVOICES)
    return n.type === NOTIFICATION_TYPES.INVOICE_VIEWED || n.type === NOTIFICATION_TYPES.CHANGE_ORDER;
  if (filter === FILTER_TABS.MESSAGES)
    return n.type === NOTIFICATION_TYPES.MESSAGE;
  if (filter === FILTER_TABS.MEETINGS)
    return n.type === NOTIFICATION_TYPES.MEETING_SUMMARY;
  return true;
}
