import { useEffect, useState } from 'react';
import { lsRead, lsSubscribe, lsWrite } from '../utils/localStore';
import { showToast } from '../utils/toast';
import EmptyState from '../components/EmptyState';

const KEY = 'scout_disputes';

function readDisputes() {
  return lsRead(KEY, []);
}

function writeDisputes(list) {
  lsWrite(KEY, list);
}

const STATUS = {
  open: { label: 'Open', bg: '#fee2e2', color: '#991b1b' },
  under_review: { label: 'Under review', bg: '#fef3c7', color: '#92400e' },
  resolved: { label: 'Resolved', bg: '#dcfce7', color: '#166534' },
};

export default function Disputes() {
  const [list, setList] = useState(() => readDisputes());
  const [open, setOpen] = useState(false);

  useEffect(() => lsSubscribe(KEY, () => setList(readDisputes())), []);

  const file = (dispute) => {
    const next = [{ ...dispute, id: `disp_${Date.now()}`, createdAt: new Date().toISOString(), status: 'open' }, ...list];
    writeDisputes(next);
    setList(next);
    setOpen(false);
    showToast('Dispute filed (demo)', 'success');
  };

  const advance = (id) => {
    const next = list.map((d) => {
      if (d.id !== id) return d;
      if (d.status === 'open') return { ...d, status: 'under_review' };
      if (d.status === 'under_review') return { ...d, status: 'resolved', resolvedAt: new Date().toISOString() };
      return d;
    });
    writeDisputes(next);
    setList(next);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, alignItems: 'center', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Disputes</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            Open a case for scope, billing, or communication disagreements.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} style={primaryBtn}>
          File a dispute
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No disputes" body="Open a case if something goes wrong — we'll track status and resolution here." />
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((d) => {
            const st = STATUS[d.status] || STATUS.open;
            return (
              <li key={d.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{d.subject}</div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: st.bg,
                      color: st.color,
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap' }}>{d.details}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                    Filed {new Date(d.createdAt).toLocaleDateString()}
                    {d.projectId ? ` · Project ${d.projectId}` : ''}
                  </span>
                  {d.status !== 'resolved' ? (
                    <button type="button" onClick={() => advance(d.id)} style={secondaryBtn}>
                      {d.status === 'open' ? 'Mark under review' : 'Mark resolved'}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open ? <DisputeModal onClose={() => setOpen(false)} onSubmit={file} /> : null}
    </div>
  );
}

function DisputeModal({ onClose, onSubmit }) {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('scope');

  return (
    <div className="scout-cmdk-overlay" role="dialog" aria-modal="true" aria-label="File a dispute" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 'min(520px, 92vw)', background: 'var(--color-surface)', borderRadius: 14, padding: 20, border: '1px solid var(--color-border)' }}>
        <h2 style={{ marginTop: 0 }}>File a dispute</h2>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={fieldStyle} placeholder="Short description" />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>
            <option value="scope">Scope</option>
            <option value="billing">Billing</option>
            <option value="communication">Communication</option>
            <option value="quality">Quality / deliverables</option>
          </select>
        </Field>
        <Field label="Project ID (optional)">
          <input value={projectId} onChange={(e) => setProjectId(e.target.value)} style={fieldStyle} placeholder="e.g. proj_123" />
        </Field>
        <Field label="Details">
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} style={fieldStyle} placeholder="What happened? Include dates and any context." />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button
            type="button"
            disabled={!subject.trim() || !details.trim()}
            onClick={() => onSubmit({ subject, details, projectId, category })}
            style={{ ...primaryBtn, opacity: !subject.trim() || !details.trim() ? 0.5 : 1 }}
          >
            File dispute
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
};

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
