import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function InviteToProjectModal({ target, onClose, onInvited }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/projects');
        if (!cancelled) {
          setProjects(Array.isArray(data) ? data : []);
          if (data?.length) setSelectedId(data[0].id);
        }
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSending(true); setErr('');
    try {
      await api.post(`/projects/${selectedId}/invitations`, {
        invitee_id: target.id,
        message: message.trim() || null,
      });
      onInvited?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSend}
        style={{
          background: 'var(--color-surface)', borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Invite {target.name} to a project</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-3)' }}>
            They'll see your invitation and decide whether to accept.
          </p>
        </div>

        {loading && <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Loading projects…</p>}

        {!loading && projects.length === 0 && (
          <div style={{
            padding: 14, borderRadius: 10, background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 13 }}>You don't have a project yet.</p>
            <button
              type="button"
              onClick={() => { onClose?.(); navigate('/projects/new'); }}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: 'var(--color-primary)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Create project
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Project</label>
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                style={{
                  padding: '10px 12px', borderRadius: 8, fontSize: 14,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text)',
                  outline: 'none',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Message <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Add a short note…"
                style={{
                  padding: '10px 12px', borderRadius: 8, fontSize: 14,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text)',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>

            {err && (
              <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
                {err}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !selectedId}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
