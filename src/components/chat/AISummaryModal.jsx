import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { isDemoMode } from '../../api/demoAdapter';

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 14 }}>
      <h3 style={{
        margin: '0 0 6px', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--color-text-3)',
      }}>{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }) {
  if (!items || !items.length) {
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-3)' }}>—</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((x, i) => (
        <li key={i} style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
          {typeof x === 'string' ? x : (x.text ? (
            <><span>{x.text}</span>{x.owner ? <em style={{ color: 'var(--color-text-3)' }}> — {x.owner}</em> : null}</>
          ) : JSON.stringify(x))}
        </li>
      ))}
    </ul>
  );
}

export default function AISummaryModal({ open, onClose, projectId, projectName }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || projectId == null) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    setData(null);
    (async () => {
      try {
        if (isDemoMode()) {
          // Demo fallback stub
          await new Promise((r) => setTimeout(r, 600));
          if (!cancelled) setData({
            summary: 'Demo mode — connect the backend for a real AI summary of this conversation.',
            key_points: [], decisions: [], action_items: [], open_questions: [],
            message_count: 0,
          });
          return;
        }
        const { data: resp } = await api.post(`/projects/${projectId}/chat/summary`);
        if (!cancelled) setData(resp);
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.detail || 'Failed to load summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, projectId]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(15,22,35,0.45)', border: 'none', cursor: 'pointer' }}
      />
      <div
        role="dialog" aria-modal="true" aria-labelledby="ai-summary-title"
        style={{
          position: 'fixed', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 211,
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'min(92vh, 720px)', overflow: 'auto',
          background: 'var(--color-surface)', borderRadius: 14,
          boxShadow: '0 24px 48px rgba(15, 22, 35, 0.18)', padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: '#7c3aed',
              background: '#f5f3ff', padding: '3px 8px', borderRadius: 999,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.8 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z"/></svg>
              AI Summary
            </div>
            <h2 id="ai-summary-title" style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 700 }}>
              {projectName || 'Project'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-3)', padding: 4 }}>
            ×
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, color: 'var(--color-text-3)', fontSize: 13 }}>
            <div className="scout-spinner scout-spinner--on-light" style={{ width: 18, height: 18 }} aria-hidden />
            Summarizing this conversation…
          </div>
        )}

        {err && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
            {err}
          </div>
        )}

        {data && (
          <>
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)',
            }}>
              {data.summary}
            </div>

            <Section title="Key Points"><Bullets items={data.key_points} /></Section>
            <Section title="Decisions"><Bullets items={data.decisions} /></Section>
            <Section title="Action Items"><Bullets items={data.action_items} /></Section>
            <Section title="Open Questions"><Bullets items={data.open_questions} /></Section>

            <p style={{ marginTop: 18, fontSize: 11, color: 'var(--color-text-3)' }}>
              Based on {data.message_count ?? 0} message{(data.message_count ?? 0) === 1 ? '' : 's'} in this chat.
            </p>
          </>
        )}
      </div>
    </>
  );
}
