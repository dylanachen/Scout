import { useEffect, useMemo, useState } from 'react';
import { lsRead, lsWrite } from '../utils/localStore';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../utils/toast';

const KEY = 'scout_referrals';

function readReferralState(userId) {
  const all = lsRead(KEY, {});
  return all[userId] || { invitesSent: [], joinedCount: 0 };
}

function writeReferralState(userId, next) {
  const all = lsRead(KEY, {});
  all[userId] = next;
  lsWrite(KEY, all);
}

export default function Referrals() {
  const { user } = useAuth();
  const userId = user?.id || user?.email || 'demo-user';
  const [state, setState] = useState(() => readReferralState(userId));
  const [email, setEmail] = useState('');

  useEffect(() => setState(readReferralState(userId)), [userId]);

  const link = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scout.example.com';
    return `${origin}/refer/${encodeURIComponent(userId)}`;
  }, [userId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Referral link copied', 'success');
    } catch {
      showToast('Could not copy. Select and copy manually.', 'error');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Scout', text: 'Join me on Scout', url: link });
      } catch {
        /* cancelled */
      }
    } else {
      copy();
    }
  };

  const sendInvite = () => {
    if (!email.trim()) return;
    const next = { ...state, invitesSent: [...state.invitesSent, { email: email.trim(), at: new Date().toISOString() }] };
    writeReferralState(userId, next);
    setState(next);
    setEmail('');
    showToast(`Invite queued for ${email.trim()}`, 'success');
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Referrals</h1>
      <p style={{ margin: '4px 0 18px', color: 'var(--color-text-3)', fontSize: 13 }}>
        Invite other freelancers or clients to Scout.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Invites sent" value={state.invitesSent.length} />
        <StatCard label="Joined" value={state.joinedCount} />
        <StatCard label="Pending" value={Math.max(0, state.invitesSent.length - state.joinedCount)} />
      </div>

      <section style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, background: 'var(--color-surface)', marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Your referral link</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            readOnly
            value={link}
            style={{
              flex: '1 1 260px',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-2)',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
            onFocus={(e) => e.target.select()}
            aria-label="Referral URL"
          />
          <button type="button" onClick={copy} style={primaryBtn}>Copy</button>
          <button type="button" onClick={share} style={secondaryBtn}>Share</button>
        </div>
      </section>

      <section style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, background: 'var(--color-surface)' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Invite by email</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            type="email"
            style={{ flex: '1 1 240px', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}
            onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
          />
          <button type="button" onClick={sendInvite} style={primaryBtn}>Send invite</button>
        </div>

        {state.invitesSent.length > 0 ? (
          <ul style={{ marginTop: 14, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.invitesSent.slice().reverse().map((inv, i) => (
              <li
                key={`${inv.email}-${i}`}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--color-text-2)',
                }}
              >
                <span>{inv.email}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                  {new Date(inv.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, background: 'var(--color-surface)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const primaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
