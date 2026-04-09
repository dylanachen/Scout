import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserSettings, setUserSettings } from '../../utils/userSettingsStorage';

const LEVELS = [
  {
    value: 0,
    label: 'Relaxed',
    description: 'Flags only clear, significant out-of-scope requests',
    icon: 'outline',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.06)',
  },
  {
    value: 1,
    label: 'Balanced',
    description: 'Flags moderate deviations with relevant contract context',
    icon: 'half',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.06)',
  },
  {
    value: 2,
    label: 'Strict',
    description: 'Flags anything that could be interpreted as outside scope',
    icon: 'filled',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.06)',
  },
];

function ShieldIcon({ variant, size = 28, color }) {
  const s = size;
  if (variant === 'outline') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l8 4v6c0 5-3.5 9.2-8 10-4.5-.8-8-5-8-10V7l8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === 'half') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l8 4v6c0 5-3.5 9.2-8 10-4.5-.8-8-5-8-10V7l8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 3v20c-4.5-.8-8-5-8-10V7l8-4z" fill={color} opacity="0.25" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4v6c0 5-3.5 9.2-8 10-4.5-.8-8-5-8-10V7l8-4z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function ScopeGuardianSettings() {
  const { user } = useAuth();
  const userId = user?.id;

  const [value, setValue] = useState(1);

  useEffect(() => {
    setValue(getUserSettings(userId).scopeSensitivity);
  }, [userId]);

  const select = (v) => {
    setValue(v);
    setUserSettings(userId, { scopeSensitivity: v });
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

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Scope Guardian sensitivity</h1>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text)', margin: '0 0 20px' }}>
        How aggressively should we flag scope?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {LEVELS.map((l) => {
          const active = value === l.value;
          const borderColor = active ? l.color : 'var(--color-border)';
          const iconColor = active ? l.color : 'var(--color-text-3)';
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => select(l.value)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '18px 18px',
                borderRadius: 14,
                border: `2px solid ${borderColor}`,
                background: active ? l.bg : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                position: 'relative',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <span style={{ marginTop: 2 }}>
                <ShieldIcon variant={l.icon} color={iconColor} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                  {l.label}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.45 }}>
                  {l.description}
                </span>
              </span>
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(29, 110, 205, 0.3)',
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
        Changes save automatically.
      </p>
    </div>
  );
}
