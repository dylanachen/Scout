import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function formatBudget(min, max) {
  const fmt = (v) => `$${Math.round(v / 100 / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function StatusBadge({ status }) {
  const map = {
    pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
    accepted: { bg: '#dcfce7', color: '#166534', label: 'Accepted' },
    declined: { bg: '#f3f4f6', color: '#6b7280', label: 'Declined' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>{s.label}</span>
  );
}

export default function Invitations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.get('/invitations');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setErr('Could not load invitations.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!authLoading && user && user.role === 'client') {
    return <Navigate to="/" replace />;
  }

  const respond = async (invId, status, inv) => {
    setActingId(invId);
    try {
      await api.patch(`/invitations/${invId}`, { status });
      setList((prev) => prev.map((i) => i.id === invId ? { ...i, status } : i));
      if (status === 'accepted') {
        navigate('/matches/confirm', {
          state: {
            projectId: inv.project_id,
            projectName: inv.project_name,
            projectSummary: inv.description,
            me: { name: user?.name ?? 'You', avatarUrl: user?.avatar_url ?? null },
            other: { name: inv.inviter_name, avatarUrl: null, role: 'client' },
          },
        });
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 88px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Invitations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px' }}>
          Project invitations from clients. Review and choose whether to accept.
        </p>

        {err && (
          <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
            {err}
          </div>
        )}
        {loading && <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Loading…</p>}

        {!loading && list.length === 0 && (
          <div style={{
            padding: 24, borderRadius: 12, background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No invitations yet.</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-3)' }}>
              When a client invites you to a project, it'll show up here.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((i) => {
            const pending = i.status === 'pending';
            const budget = formatBudget(i.budget_min, i.budget_max);
            return (
              <article
                key={i.id}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 12, padding: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
                        {i.project_name}
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>
                      Invited by <strong style={{ color: 'var(--color-text-2)' }}>{i.inviter_name}</strong>
                      {i.client_name && <span> · {i.client_name}</span>}
                    </div>
                  </div>
                </div>

                {i.description && (
                  <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                    {i.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--color-text-2)' }}>
                  {budget && <div><strong>Budget:</strong> {budget}</div>}
                  {i.timeline_weeks ? <div><strong>Timeline:</strong> {i.timeline_weeks} wk</div> : null}
                  {i.required_skills?.length ? (
                    <div><strong>Skills:</strong> {i.required_skills.join(', ')}</div>
                  ) : null}
                </div>

                {i.message && (
                  <blockquote style={{
                    margin: '12px 0 0', padding: '10px 12px', borderLeft: '3px solid var(--color-primary)',
                    fontSize: 13, color: 'var(--color-text-2)', background: 'var(--color-surface-2)',
                    borderRadius: '0 8px 8px 0', fontStyle: 'italic',
                  }}>
                    "{i.message}"
                  </blockquote>
                )}

                {pending && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={actingId === i.id}
                      onClick={() => respond(i.id, 'accepted', i.project_id)}
                      style={{
                        padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: 'var(--color-primary)', color: '#fff',
                        fontSize: 13, fontWeight: 700,
                        cursor: actingId === i.id ? 'not-allowed' : 'pointer',
                        opacity: actingId === i.id ? 0.7 : 1,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actingId === i.id}
                      onClick={() => respond(i.id, 'declined', i.project_id)}
                      style={{
                        padding: '9px 18px', borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        background: 'transparent', color: 'var(--color-text-2)',
                        fontSize: 13, fontWeight: 600,
                        cursor: actingId === i.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
                {i.status === 'accepted' && (
                  <button
                    type="button"
                    onClick={() => navigate('/chat', { state: { projectId: i.project_id } })}
                    style={{
                      marginTop: 12, padding: '9px 18px', borderRadius: 10, border: 'none',
                      background: 'var(--color-primary)', color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Open project chat
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
