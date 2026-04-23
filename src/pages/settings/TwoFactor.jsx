import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lsRead, lsWrite } from '../../utils/localStore';
import { showToast } from '../../utils/toast';

const KEY = 'scout_two_factor';

function makeSecret() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function fakeCode(secret) {
  let h = 0;
  const windowMinute = Math.floor(Date.now() / 30_000);
  const basis = `${secret}:${windowMinute}`;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) >>> 0;
  }
  return String(h % 1_000_000).padStart(6, '0');
}

function QrPlaceholder({ value }) {
  const bytes = new TextEncoder().encode(value);
  const size = 12;
  return (
    <svg width={size * 16} height={size * 16} aria-hidden style={{ borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff' }}>
      {Array.from({ length: 16 }, (_, y) =>
        Array.from({ length: 16 }, (_, x) => {
          const i = y * 16 + x;
          const byte = bytes[i % bytes.length] || 0;
          const on = ((byte >> (x % 8)) & 1) === 1;
          return <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={on ? '#111' : '#fff'} />;
        }),
      )}
    </svg>
  );
}

export default function TwoFactor() {
  const [state, setState] = useState(() => lsRead(KEY, { enabled: false }));
  const [secret, setSecret] = useState(() => (state.enabled ? state.secret : null));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.enabled && !secret) setSecret(makeSecret());
  }, [state.enabled, secret]);

  const confirm = () => {
    setError('');
    const expected = fakeCode(secret);
    if (code !== expected) {
      setError(`Code does not match (demo expected: ${expected}).`);
      return;
    }
    const next = { enabled: true, secret, enabledAt: new Date().toISOString() };
    lsWrite(KEY, next);
    setState(next);
    showToast('Two-factor authentication enabled', 'success');
  };

  const disable = () => {
    lsWrite(KEY, { enabled: false });
    setState({ enabled: false });
    setSecret(makeSecret());
    setCode('');
    showToast('Two-factor disabled', 'info');
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 60px' }}>
      <Link to="/settings" style={{ fontSize: 13, color: 'var(--color-text-3)', textDecoration: 'none' }}>← Settings</Link>
      <h1 style={{ margin: '12px 0 6px', fontSize: 22, fontWeight: 800 }}>Two-factor authentication</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-text-3)' }}>
        Client-side demo: scans a generated secret and accepts a matching 6-digit code (rotates every 30 seconds).
      </p>

      {state.enabled ? (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, background: 'var(--color-surface)' }}>
          <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>✓ 2FA is active</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
            Enabled {new Date(state.enabledAt).toLocaleString()} · Secret hidden
          </div>
          <button
            type="button"
            onClick={disable}
            style={{ marginTop: 14, padding: '10px 16px', borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-danger)', fontWeight: 600, cursor: 'pointer' }}
          >
            Disable 2FA
          </button>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>1. Scan this code in your authenticator app</div>
            <QrPlaceholder value={`otpauth://totp/Scout?secret=${secret}`} />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Or enter this secret manually</div>
            <code style={{ fontSize: 14, background: 'var(--color-surface-2)', padding: '6px 10px', borderRadius: 6, letterSpacing: 2 }}>{secret}</code>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
              2. Enter the 6-digit code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 16, letterSpacing: 2 }}
            />
            {error ? <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 6 }}>{error}</div> : null}
          </div>
          <button
            type="button"
            disabled={code.length !== 6}
            onClick={confirm}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: code.length === 6 ? 'var(--color-primary)' : '#a8c4e0',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: code.length === 6 ? 'pointer' : 'not-allowed',
            }}
          >
            Enable 2FA
          </button>
        </div>
      )}
    </div>
  );
}
