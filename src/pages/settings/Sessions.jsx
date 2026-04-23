import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lsRead, lsWrite } from '../../utils/localStore';
import { showToast } from '../../utils/toast';

const KEY = 'scout_sessions';

function seed() {
  const current = {
    id: 'current',
    device: navigator.userAgent.split(') ')[0].replace('(', '') || 'Current device',
    location: 'This device',
    lastActive: new Date().toISOString(),
    current: true,
  };
  const others = [
    { id: 's1', device: 'iPhone · Mobile Safari', location: 'Brooklyn, NY', lastActive: new Date(Date.now() - 3 * 3600_000).toISOString(), current: false },
    { id: 's2', device: 'MacBook Pro · Chrome', location: 'New York, NY', lastActive: new Date(Date.now() - 26 * 3600_000).toISOString(), current: false },
    { id: 's3', device: 'Windows · Edge', location: 'Unknown', lastActive: new Date(Date.now() - 6 * 86400_000).toISOString(), current: false },
  ];
  return [current, ...others];
}

export default function Sessions() {
  const [list, setList] = useState(() => lsRead(KEY, null) || seed());

  useEffect(() => {
    lsWrite(KEY, list);
  }, [list]);

  const signOut = (id) => {
    setList((cur) => cur.filter((s) => s.id !== id || s.current));
    showToast('Session signed out', 'info');
  };

  const signOutOthers = () => {
    setList((cur) => cur.filter((s) => s.current));
    showToast('All other sessions signed out', 'success');
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 60px' }}>
      <Link to="/settings" style={{ fontSize: 13, color: 'var(--color-text-3)', textDecoration: 'none' }}>← Settings</Link>
      <h1 style={{ margin: '12px 0 6px', fontSize: 22, fontWeight: 800 }}>Active sessions</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-text-3)' }}>
        Review devices where you&apos;re signed in. Sign out of unfamiliar ones.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((s) => (
          <li key={s.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {s.device}
                  {s.current ? (
                    <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                      Current
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                  {s.location} · Last active {new Date(s.lastActive).toLocaleString()}
                </div>
              </div>
              {!s.current ? (
                <button
                  type="button"
                  onClick={() => signOut(s.id)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {list.some((s) => !s.current) ? (
        <button
          type="button"
          onClick={signOutOthers}
          style={{ marginTop: 14, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-danger)', fontWeight: 600, cursor: 'pointer' }}
        >
          Sign out other sessions
        </button>
      ) : null}
    </div>
  );
}
