import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allFlags, FLAG_DEFAULTS, resetFlags, setFlag } from '../../utils/featureFlags';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(() => allFlags());

  useEffect(() => {
    const handler = () => setFlags(allFlags());
    window.addEventListener('scout-feature-flags', handler);
    return () => window.removeEventListener('scout-feature-flags', handler);
  }, []);

  const toggle = (name) => {
    setFlag(name, !flags[name]);
    setFlags(allFlags());
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 60px' }}>
      <Link to="/settings" style={{ fontSize: 13, color: 'var(--color-text-3)', textDecoration: 'none' }}>← Settings</Link>
      <h1 style={{ margin: '12px 0 6px', fontSize: 22, fontWeight: 800 }}>Feature flags</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-text-3)' }}>
        Client-only toggles. Used to gate experimental features.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.keys(FLAG_DEFAULTS).map((name) => (
          <li
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              background: 'var(--color-surface)',
            }}
          >
            <span style={{ fontWeight: 600 }}>{name}</span>
            <button
              type="button"
              onClick={() => toggle(name)}
              role="switch"
              aria-checked={!!flags[name]}
              style={{
                width: 48,
                height: 26,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: flags[name] ? 'var(--color-primary)' : 'var(--color-surface-3)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: flags[name] ? 24 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.18s',
                }}
              />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          resetFlags();
          setFlags(allFlags());
        }}
        style={{ marginTop: 14, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', fontWeight: 600, cursor: 'pointer' }}
      >
        Reset to defaults
      </button>
    </div>
  );
}
