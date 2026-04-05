import { useState } from 'react';
import { api } from '../api/client';

export default function ContractPanel({ projectId, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file || !projectId) return;
    setUploading(true);
    setStatus('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/projects/${projectId}/contract`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('Uploaded.');
      setFile(null);
    } catch {
      setStatus('Upload failed — is the API running?');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        width: 320,
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Statement of work</div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-3)' }}>
          ×
        </button>
      </div>
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5, margin: '0 0 12px' }}>
          Upload a contract PDF for the AI Scope Guardian (RAG). Endpoint: <code>POST /projects/:id/contract</code>
        </p>
        <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          type="button"
          disabled={!file || uploading}
          onClick={upload}
          style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: file && !uploading ? 'pointer' : 'default',
            opacity: file && !uploading ? 1 : 0.5,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {status && <p style={{ fontSize: 12, marginTop: 10, color: 'var(--color-text-2)' }}>{status}</p>}
      </div>
    </div>
  );
}
