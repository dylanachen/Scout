import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useProjectFromParams } from '../hooks/useProjectFromParams';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function isPdfFile(file) {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return /\.pdf$/i.test(file.name ?? '');
}

export default function ContractUpload() {
  const { projectId, projectName } = useProjectFromParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [contracts, setContracts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listErr, setListErr] = useState('');

  const loadContracts = useCallback(async () => {
    if (!projectId) return;
    setListLoading(true);
    setListErr('');
    try {
      const { data } = await api.get(`/projects/${projectId}/contracts`);
      setContracts(Array.isArray(data) ? data : []);
    } catch (e) {
      setListErr(e?.response?.data?.detail || 'Could not load existing contracts.');
      setContracts([]);
    } finally {
      setListLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const reset = useCallback(() => {
    setFile(null);
    setFileError('');
    setSuccessMessage('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const onFile = useCallback((f) => {
    setFileError('');
    setSuccessMessage('');
    if (!isPdfFile(f)) {
      setFileError('Please upload a PDF file only.');
      return;
    }
    setFile(f);
  }, []);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const upload = async () => {
    if (!file || !projectId || uploading) return;
    setUploading(true);
    setFileError('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/projects/${projectId}/contract`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Uploaded. Scope monitoring is now active — the AI is indexing your contract in the background.');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      loadContracts();
    } catch (e) {
      setFileError(e?.response?.data?.detail || 'Upload failed. Is the backend running?');
    } finally {
      setUploading(false);
    }
  };

  const removeContract = async (id) => {
    if (!window.confirm('Delete this contract? This also removes its scope-tracking data.')) return;
    try {
      await api.delete(`/contracts/${id}`);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete contract.');
    }
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', width: '100%' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            to="/projects"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            ← Projects
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 6px', letterSpacing: '-0.03em' }}>
            Contracts {projectName ? <span style={{ color: 'var(--color-text-3)', fontWeight: 600, fontSize: 15 }}>· {projectName}</span> : null}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
            Upload the SOW or contract PDF. The AI indexes it for real-time scope monitoring and chat Q&amp;A.
          </p>
        </div>

        {/* Existing contracts list */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', margin: '0 0 10px' }}>
            Uploaded contracts
          </h2>

          {listLoading && (
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Loading…</p>
          )}
          {listErr && (
            <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, border: '1px solid #fecaca' }}>
              {listErr}
            </div>
          )}
          {!listLoading && !listErr && contracts.length === 0 && (
            <div style={{
              padding: 16, borderRadius: 10, background: 'var(--color-surface-2)',
              border: '1px dashed var(--color-border)', fontSize: 13, color: 'var(--color-text-3)',
            }}>
              No contracts uploaded yet. Upload one below to enable Scope Guardian.
            </div>
          )}
          {contracts.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contracts.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#ecfdf3', color: '#16a34a', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-hidden
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M9 13h6M9 17h6M9 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>{c.filename}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                      Uploaded {formatDate(c.uploaded_at)}
                    </div>
                  </div>
                  {c.url && (
                    <a
                      href={`${API_BASE}${c.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '7px 12px', borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => removeContract(c.id)}
                    style={{
                      padding: '7px 12px', borderRadius: 8,
                      border: '1px solid #fecaca', background: 'transparent',
                      color: '#dc2626', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upload zone */}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={onInputChange} />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${fileError ? '#dc2626' : dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            background: fileError ? 'rgba(220, 38, 38, 0.04)' : dragOver ? 'rgba(29, 110, 205, 0.06)' : 'var(--color-surface)',
            cursor: 'pointer',
            transition: 'border-color var(--transition), background var(--transition)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6.5 19.5h11a4 4 0 001.3-7.78 5.5 5.5 0 00-10.6 0A4 4 0 006.5 19.5z"
                stroke={fileError ? '#dc2626' : 'var(--color-primary)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <path d="M12 13v-5m0 0l-2.5 2.5M12 8l2.5 2.5" stroke={fileError ? '#dc2626' : 'var(--color-primary)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Drag a PDF here</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6 }}>or tap to browse</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>PDF only · up to ~20MB</div>
        </div>

        {fileError && (
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 10,
            background: '#fef2f2', color: '#991b1b', fontSize: 13, border: '1px solid #fecaca',
          }}>
            {fileError}
          </div>
        )}

        {successMessage && (
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 10,
            background: '#ecfdf3', color: '#166534', fontSize: 13, border: '1px solid #bbf7d0',
          }}>
            {successMessage}
          </div>
        )}

        {file && !fileError && (
          <div
            style={{
              marginTop: 16, padding: '16px 18px', borderRadius: 12,
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#eff6ff', color: '#1d4ed8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
              aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{formatFileSize(file.size)}</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); reset(); }}
                disabled={uploading}
                style={{
                  border: 'none', background: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--color-danger, #dc2626)',
                  padding: 0, flexShrink: 0, opacity: uploading ? 0.5 : 1,
                }}
              >
                × Remove
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={upload}
                disabled={uploading || !projectId}
                style={{
                  padding: '11px 18px', borderRadius: 10,
                  background: uploading ? 'var(--color-surface-3)' : 'var(--color-primary)',
                  color: uploading ? 'var(--color-text-3)' : '#fff',
                  fontWeight: 700, fontSize: 14, border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  boxShadow: uploading ? 'none' : '0 4px 14px rgba(29, 110, 205, 0.35)',
                }}
              >
                {uploading ? 'Uploading…' : 'Upload and Activate'}
              </button>
              {uploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="scout-spinner scout-spinner--on-light" style={{ width: 16, height: 16 }} aria-hidden />
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Indexing will start in the background…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {projectId && (
          <div style={{ marginTop: 28, fontSize: 12, color: 'var(--color-text-3)' }}>
            <button
              type="button"
              onClick={() => navigate('/chat', { state: { projectId } })}
              style={{
                padding: 0, background: 'none', border: 'none',
                color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 12,
              }}
            >
              ← Back to Chat
            </button>
            {' · '}
            <Link to={`/projects/${projectId}/change-order`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Change order preview
            </Link>
            {' · '}
            <Link to={`/projects/${projectId}/scope-drift`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Scope drift report
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
