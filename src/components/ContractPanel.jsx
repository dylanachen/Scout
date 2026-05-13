import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function formatFileSize(bytes) {
  if (bytes == null) return '';
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

export default function ContractPanel({ projectId, onClose }) {
  const inputRef = useRef(null);

  const [tab, setTab] = useState('contracts');   // 'contracts' | 'summary'
  const [contracts, setContracts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listErr, setListErr] = useState('');

  // Per-contract summary state, keyed by contract id.
  // Shape: { [id]: { loading, data, err, refreshing } }
  const [summaries, setSummaries] = useState({});

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  // Esc to close + body scroll lock
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const reset = () => {
    setFile(null);
    setFileError('');
    setSuccessMessage('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = (f) => {
    setFileError('');
    setSuccessMessage('');
    if (!isPdfFile(f)) {
      setFileError('Please upload a PDF file only.');
      return;
    }
    setFile(f);
  };

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
      setSummaries((prev) => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete contract.');
    }
  };

  const loadSummary = useCallback(async (contractId, { force = false } = {}) => {
    setSummaries((prev) => ({
      ...prev,
      [contractId]: {
        ...(prev[contractId] || {}),
        loading: !prev[contractId]?.data,
        refreshing: !!prev[contractId]?.data,
        err: '',
      },
    }));
    try {
      const { data } = await api.get(`/contracts/${contractId}/summary${force ? '?refresh=true' : ''}`);
      setSummaries((prev) => ({
        ...prev,
        [contractId]: { loading: false, refreshing: false, err: '', data },
      }));
    } catch (e) {
      setSummaries((prev) => ({
        ...prev,
        [contractId]: {
          ...(prev[contractId] || {}),
          loading: false,
          refreshing: false,
          err: e?.response?.data?.detail || 'Could not load summary.',
        },
      }));
    }
  }, []);

  // Auto-load summaries for all contracts when the user opens the Summary tab.
  useEffect(() => {
    if (tab !== 'summary') return;
    for (const c of contracts) {
      if (!summaries[c.id]?.data && !summaries[c.id]?.loading) {
        loadSummary(c.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, contracts]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Project contracts"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8, 12, 20, 0.55)',
        zIndex: 10070,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px 0',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>Contracts</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
              View, upload, and read AI summaries of project contracts.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--color-text-2)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Contracts tabs"
          style={{
            display: 'flex',
            gap: 4,
            padding: '12px 18px 0',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          {[
            ['contracts', 'Contracts'],
            ['summary', 'Summary'],
          ].map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                style={{
                  padding: '8px 12px',
                  marginBottom: -1,
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--color-primary)' : 'transparent'}`,
                  background: 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {label}
                {id === 'contracts' && contracts.length > 0 && (
                  <span style={{ marginLeft: 6, color: 'var(--color-text-3)', fontWeight: 600 }}>
                    {contracts.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: tab === 'contracts' ? 'block' : 'none' }}>
          {/* Existing contracts list */}
          <section style={{ marginBottom: 22 }}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-3)',
                margin: '0 0 10px',
              }}
            >
              Uploaded contracts
              {contracts.length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--color-text-2)', fontWeight: 600 }}>
                  ({contracts.length})
                </span>
              )}
            </h3>

            {listLoading && (
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Loading…</p>
            )}
            {listErr && (
              <div style={{
                padding: 12, borderRadius: 10, background: '#fef2f2',
                color: '#991b1b', fontSize: 13, border: '1px solid #fecaca',
              }}>
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
                          background: 'var(--color-surface)',
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
          <section>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-3)',
                margin: '0 0 10px',
              }}
            >
              Upload new contract
            </h3>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={onInputChange}
            />

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
                borderRadius: 14,
                padding: '28px 20px',
                textAlign: 'center',
                background: fileError ? 'rgba(220, 38, 38, 0.04)' : dragOver ? 'rgba(29, 110, 205, 0.06)' : 'var(--color-surface-2)',
                cursor: 'pointer',
                transition: 'border-color var(--transition), background var(--transition)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.5 19.5h11a4 4 0 001.3-7.78 5.5 5.5 0 00-10.6 0A4 4 0 006.5 19.5z"
                    stroke={fileError ? '#dc2626' : 'var(--color-primary)'}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path d="M12 13v-5m0 0l-2.5 2.5M12 8l2.5 2.5" stroke={fileError ? '#dc2626' : 'var(--color-primary)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                Drag a PDF here
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 4 }}>or tap to browse</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>PDF only · up to ~20MB</div>
            </div>

            {fileError && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 10,
                background: '#fef2f2', color: '#991b1b', fontSize: 13, border: '1px solid #fecaca',
              }}>
                {fileError}
              </div>
            )}

            {successMessage && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 10,
                background: '#ecfdf3', color: '#166534', fontSize: 13, border: '1px solid #bbf7d0',
              }}>
                {successMessage}
              </div>
            )}

            {file && !fileError && (
              <div
                style={{
                  marginTop: 14, padding: '14px 16px', borderRadius: 12,
                  border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#eff6ff', color: '#1d4ed8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                  aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-word' }}>{file.name}</div>
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
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    × Remove
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={upload}
                    disabled={uploading || !projectId}
                    style={{
                      padding: '10px 16px', borderRadius: 10,
                      background: uploading ? 'var(--color-surface-3)' : 'var(--color-primary)',
                      color: uploading ? 'var(--color-text-3)' : '#fff',
                      fontWeight: 700, fontSize: 13, border: 'none',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      boxShadow: uploading ? 'none' : '0 4px 14px rgba(29, 110, 205, 0.35)',
                      fontFamily: 'var(--font-sans)',
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
          </section>
        </div>

        {/* Summary tab body */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: tab === 'summary' ? 'block' : 'none' }}>
          {listLoading && (
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Loading contracts…</p>
          )}
          {!listLoading && contracts.length === 0 && (
            <div style={{
              padding: 16, borderRadius: 10, background: 'var(--color-surface-2)',
              border: '1px dashed var(--color-border)', fontSize: 13, color: 'var(--color-text-3)',
            }}>
              Upload a contract first to get an AI summary.
            </div>
          )}
          {contracts.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {contracts.map((c) => {
                const s = summaries[c.id] || {};
                return (
                  <li
                    key={c.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      background: 'var(--color-surface)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-surface-2)',
                      }}
                    >
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: '#eff6ff', color: '#1d4ed8', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        aria-hidden
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-word' }}>{c.filename}</div>
                        {s.data?.cached && s.data?.generated_at && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                            Cached · generated {formatDate(s.data.generated_at)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => loadSummary(c.id, { force: true })}
                        disabled={s.loading || s.refreshing}
                        title="Regenerate summary"
                        style={{
                          padding: '6px 10px', borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-2)',
                          fontSize: 11, fontWeight: 600,
                          cursor: s.loading || s.refreshing ? 'not-allowed' : 'pointer',
                          opacity: s.loading || s.refreshing ? 0.6 : 1,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {s.refreshing ? 'Refreshing…' : '↻ Re-summarize'}
                      </button>
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                      {s.loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-3)' }}>
                          <div className="scout-spinner scout-spinner--on-light" style={{ width: 14, height: 14 }} aria-hidden />
                          Generating AI summary…
                        </div>
                      )}
                      {s.err && !s.loading && (
                        <div style={{
                          padding: 10, borderRadius: 8, background: '#fef2f2',
                          color: '#991b1b', fontSize: 13, border: '1px solid #fecaca',
                        }}>
                          {s.err}
                        </div>
                      )}
                      {s.data && !s.loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
                            {s.data.summary}
                          </p>
                          <SummarySection title="Key terms" items={s.data.key_terms} />
                          <SummarySection title="Deliverables" items={s.data.deliverables} />
                          <SummarySection title="Payment terms" items={s.data.payment_terms} />
                          <SummarySection title="Deadlines" items={s.data.deadlines} />
                          <SummarySection title="Risks to watch" items={s.data.risks} accent="#b45309" />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SummarySection({ title, items, accent }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <h4 style={{
        margin: '0 0 6px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: accent || 'var(--color-text-3)',
      }}>
        {title}
      </h4>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
            {typeof it === 'string' ? it : JSON.stringify(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}
