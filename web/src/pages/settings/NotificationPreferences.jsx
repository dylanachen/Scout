import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserSettings, patchNotificationType } from '../../utils/userSettingsStorage';
import ToggleSwitch from '../../components/settings/ToggleSwitch';

const NOTIFICATION_DEFS = [
  {
    id: 'new_messages',
    name: 'New messages',
    description: 'When someone sends you a chat message on a project.',
  },
  {
    id: 'project_updates',
    name: 'Project updates',
    description: 'Milestones, status changes, and deliverable activity.',
  },
  {
    id: 'invoice_reminders',
    name: 'Invoice reminders',
    description: 'Due dates, payment status, and overdue notices.',
  },
  {
    id: 'meeting_invites',
    name: 'Meeting invites',
    description: 'Scheduled calls and calendar invites from clients.',
  },
  {
    id: 'scope_alerts',
    name: 'Scope alerts',
    description: 'When Scope Guardian flags a possible out-of-scope request.',
  },
  {
    id: 'match_activity',
    name: 'Match activity',
    description: 'New matches, confirmations, and pipeline movement.',
  },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id;

  const [version, setVersion] = useState(0);
  const types = useMemo(() => {
    void version;
    return getUserSettings(userId).notifications.types;
  }, [userId, version]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const update = (typeId, patch) => {
    patchNotificationType(userId, typeId, patch);
    bump();
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--color-text-2)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <span aria-hidden>←</span> Settings
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Notification preferences</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 24 }}>
        Choose what you see in-app and optionally by email. Changes save automatically.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {NOTIFICATION_DEFS.map((def, i) => {
          const t = types[def.id] ?? { enabled: true, email: false };
          return (
            <div
              key={def.id}
              style={{
                padding: '18px 0',
                borderBottom: i < NOTIFICATION_DEFS.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600, minWidth: 0 }}>{def.name}</div>
                <ToggleSwitch
                  checked={!!t.enabled}
                  onChange={(v) => update(def.id, { enabled: v, ...(v ? {} : { email: false }) })}
                  label={def.name}
                />
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{def.description}</p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px dashed var(--color-border)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Email me as well</span>
                <ToggleSwitch
                  checked={!!t.email}
                  onChange={(v) => update(def.id, { email: v })}
                  disabled={!t.enabled}
                  label={`Email for ${def.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
