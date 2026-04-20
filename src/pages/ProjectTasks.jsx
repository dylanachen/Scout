import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

const STATUSES = [
  { id: 'todo',        label: 'To do',       color: '#64748b' },
  { id: 'in_progress', label: 'In progress', color: '#1d6ecd' },
  { id: 'done',        label: 'Done',        color: '#16a34a' },
];

function StatusPill({ status, onChange }) {
  const meta = STATUSES.find((s) => s.id === status) ?? STATUSES[0];
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '4px 8px', borderRadius: 999,
        background: `${meta.color}20`, color: meta.color,
        border: `1px solid ${meta.color}55`,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        cursor: 'pointer', appearance: 'none',
      }}
    >
      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

export default function ProjectTasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDue, setDraftDue] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [p, t] = await Promise.all([
        api.get(`/projects/${projectId}`).catch(() => ({ data: null })),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(p.data);
      setTasks(Array.isArray(t.data) ? t.data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: draftTitle.trim(),
        due_date: draftDue || null,
      });
      setDraftTitle(''); setDraftDue('');
      load();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to add task.');
    }
  };

  const updateStatus = async (taskId, status) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    try { await api.patch(`/tasks/${taskId}`, { status }); } catch { load(); }
  };

  const remove = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try { await api.delete(`/tasks/${taskId}`); } catch { load(); }
  };

  const [genInfo, setGenInfo] = useState(null);
  const [genErr, setGenErr] = useState('');
  const generateInvoice = async () => {
    setGenInfo(null); setGenErr('');
    try {
      const { data } = await api.post(`/projects/${projectId}/invoices/generate`, {});
      setGenInfo(data);
    } catch (e) {
      setGenErr(e?.response?.data?.detail || 'Failed to generate invoice.');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 88px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', padding: 0, marginBottom: 12,
          color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer',
        }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Tasks {project ? `— ${project.name}` : ''}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px' }}>
              Track milestones and deliverables for this project.
            </p>
          </div>
          <button type="button" onClick={generateInvoice} style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            Generate invoice
          </button>
        </div>

        {genInfo && (
          <div style={{
            padding: 12, borderRadius: 10, background: '#dcfce7', color: '#14532d',
            fontSize: 13, marginBottom: 16, lineHeight: 1.5,
          }}>
            <strong>Invoice generated:</strong> {genInfo.amount} · {genInfo.total_hours}h
            ({genInfo.entry_count} entries) — status: {genInfo.status}
          </div>
        )}
        {genErr && (
          <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
            {genErr}
          </div>
        )}

        <form onSubmit={addTask} style={{
          display: 'flex', gap: 8, padding: 12, marginBottom: 20,
          border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)',
        }}>
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Add a new task…"
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
              color: 'var(--color-text)', outline: 'none', fontSize: 14,
            }}
          />
          <input
            type="date"
            value={draftDue}
            onChange={(e) => setDraftDue(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
              color: 'var(--color-text)', outline: 'none', fontSize: 13,
            }}
          />
          <button type="submit" style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: 'var(--color-primary)', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Add</button>
        </form>

        {err && (
          <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
            {err}
          </div>
        )}
        {loading && <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Loading…</p>}

        {!loading && tasks.length === 0 && (
          <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>No tasks yet — add your first one above.</p>
        )}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t) => (
            <li key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 10,
            }}>
              <StatusPill status={t.status} onChange={(s) => updateStatus(t.id, s)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  textDecoration: t.status === 'done' ? 'line-through' : 'none',
                  color: t.status === 'done' ? 'var(--color-text-3)' : 'var(--color-text)',
                }}>{t.title}</div>
                {t.due_date && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                    Due {t.due_date}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => remove(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-3)', fontSize: 16, padding: 4,
              }} aria-label="Delete">×</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
