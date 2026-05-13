import { useRef, useState } from 'react';
import { api } from '../../api/client';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddInvoiceModal({ projectId, projectName, onClose, onCreated }) {
  const fileRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const parsedCents = (() => {
    const n = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedCents) { setErr('Enter an amount greater than $0.'); return; }
    setSaving(true); setErr('');
    try {
      const form = new FormData();
      form.append('amount_cents', String(parsedCents));
      if (title.trim()) form.append('title', title.trim());
      if (description.trim()) form.append('description', description.trim());
      if (file) form.append('file', file);
      const { data } = await api.post(`/projects/${projectId}/invoices`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreated?.(data);
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to submit invoice.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)', color: 'var(--color-text)',
    outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
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
        onSubmit={handleSubmit}
        style={{
          background: 'var(--color-surface)', borderRadius: 16, padding: 22,
          width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Submit an invoice</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-3)' }}>
            Post to <strong>{projectName || 'this project'}</strong>. An invoice message will also appear in chat.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Amount (USD) <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="e.g. 1250.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
          {parsedCents > 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Will be billed as ${(parsedCents / 100).toFixed(2)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Title <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>(optional)</span>
          </label>
          <input
            placeholder="e.g. Milestone 2 — design delivery"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Notes <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="What's this invoice covering?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Attach image or file <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>(optional)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: '10px 12px', borderRadius: 8,
            border: '1px dashed var(--color-border)',
            background: 'var(--color-surface-2)',
          }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Choose file
            </button>
            {file ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{formatSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  ×
                </button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>PNG / JPG / PDF / etc.</span>
            )}
          </div>
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
            disabled={saving}
            style={{
              padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !parsedCents}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: saving || !parsedCents ? 'var(--color-surface-3)' : 'var(--color-primary)',
              color: saving || !parsedCents ? 'var(--color-text-3)' : '#fff',
              border: 'none', cursor: saving || !parsedCents ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Submitting…' : 'Submit invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
