import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import InviteToProjectModal from '../components/InviteToProjectModal';

function Avatar({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-surface-3), #dbe4f0)',
        border: '2px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 16, color: 'var(--color-text-2)', flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function formatRate(cents) {
  if (!cents) return null;
  return `$${Math.round(cents / 100)}/hr`;
}

function formatBudget(min, max) {
  const fmt = (v) => `$${Math.round(v / 100 / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export default function Interests() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'client';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [inviteTarget, setInviteTarget] = useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.get('/interests');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setErr('Could not load interests.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!authLoading && user && !isClient) {
    return <Navigate to="/" replace />;
  }

  const handleRemove = async (targetId) => {
    try {
      await api.delete(`/interests/${targetId}`);
      setList((prev) => prev.filter((p) => p.id !== targetId));
    } catch {
      /* noop */
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 88px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Your interests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px' }}>
          {isClient
            ? 'Freelancers you marked as interested. Invite them to a specific project when ready.'
            : 'Clients you marked as interested. They may reach out with a project invite.'}
        </p>

        {err && (
          <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
            {err}
          </div>
        )}
        {loading && <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Loading…</p>}

        {!loading && list.length === 0 && (
          <div
            style={{
              padding: 24, borderRadius: 12, background: 'var(--color-surface-2)',
              border: '1px dashed var(--color-border)', textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>No interests yet.</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-3)' }}>
              Mark people as interested from your matches.
            </p>
            <button
              type="button"
              onClick={() => navigate('/matches')}
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: 'var(--color-primary)', color: '#fff', fontWeight: 600,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Browse matches
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => (
            <article
              key={p.id}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              <Avatar name={p.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  {p.specialty && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>· {p.specialty}</span>
                  )}
                  {p.location && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>· {p.location}</span>
                  )}
                </div>
                {p.bio && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.45 }}>
                    {p.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {(p.skills || []).slice(0, 6).map((s) => (
                    <span key={s} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                      background: 'var(--color-surface-3)', color: 'var(--color-text-2)',
                    }}>{s}</span>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
                  {p.role === 'freelancer' && formatRate(p.hourly_rate)}
                  {p.role === 'client' && formatBudget(p.budget_min, p.budget_max)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isClient && p.role === 'freelancer' && (
                  <button
                    type="button"
                    onClick={() => setInviteTarget(p)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--color-primary)', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Invite to project
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {inviteTarget && (
        <InviteToProjectModal
          target={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onInvited={() => { setInviteTarget(null); }}
        />
      )}
    </div>
  );
}
