/** Client-side prefs (notifications, scope, rates, communication) — keyed by user id. */

const KEY = (id) => `fos_user_settings_${id}`;

const defaultNotificationTypes = () => ({
  new_messages: { enabled: true, email: false },
  project_updates: { enabled: true, email: true },
  invoice_reminders: { enabled: true, email: true },
  meeting_invites: { enabled: true, email: false },
  scope_alerts: { enabled: true, email: true },
  match_activity: { enabled: true, email: false },
});

const defaults = () => ({
  notifications: { types: defaultNotificationTypes() },
  scopeSensitivity: 1,
  ratesPricing: {
    defaultHourlyRate: '',
    projectRateMode: 'hourly',
    taxRate: '',
    paymentTerms: 'net30',
    customTerms: '',
  },
  communication: {
    responseTime: 'same_day',
    meeting: 'mix',
    feedback: 'detailed',
  },
});

function deepMerge(base, patch) {
  if (patch == null || typeof patch !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    const bv = base[k];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[k] = deepMerge(bv, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

export function getUserSettings(userId) {
  const base = defaults();
  if (userId == null) return base;
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return deepMerge(base, parsed);
  } catch {
    return base;
  }
}

export function setUserSettings(userId, patch) {
  if (userId == null) return;
  try {
    const prev = getUserSettings(userId);
    localStorage.setItem(KEY(userId), JSON.stringify(deepMerge(prev, patch)));
  } catch {
    /* ignore */
  }
}

export function patchNotificationType(userId, typeId, patch) {
  const s = getUserSettings(userId);
  const prev = s.notifications.types[typeId] ?? { enabled: true, email: false };
  const types = { ...s.notifications.types, [typeId]: { ...prev, ...patch } };
  setUserSettings(userId, { notifications: { types } });
}
