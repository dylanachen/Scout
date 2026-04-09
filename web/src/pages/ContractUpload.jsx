import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectFromParams } from '../hooks/useProjectFromParams';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file) {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return /\.pdf$/i.test(file.name ?? '');
}

export default function ContractUpload() {
  const { projectId, projectName, loading } = useProjectFromParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [contractActive, setContractActive] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setFileError('');
    setProcessing(false);
    setContractActive(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const runPipeline = useCallback(() => {
    setProcessing(true);
    setContractActive(false);
    window.setTimeout(() => {
      setProcessing(false);
      setContractActive(true);
    }, 3500);
  }, []);

  const onFile = useCallback((f) => {
    setFileError('');
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

  if (contractActive) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          Scope monitoring is now active
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 28px' }}>
          Your contract has been processed and scope tracking is enabled.
        </p>
        <button
          type="button"
          onClick={() => navigate('/chat', { state: { projectId } })}
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
          }}
        >
          Back to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/projects"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          ← Projects
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 6px', letterSpacing: '-0.03em' }}>Upload Your Contract</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
          Upload your SOW or contract PDF to activate real-time scope monitoring
        </p>
      </div>

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
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${fileError ? '#dc2626' : dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          background: fileError ? 'rgba(220, 38, 38, 0.04)' : dragOver ? 'rgba(29, 110, 205, 0.06)' : 'var(--color-surface)',
          cursor: 'pointer',
          transition: 'border-color var(--transition), background var(--transition)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6.5 19.5h11a4 4 0 001.3-7.78 5.5 5.5 0 00-10.6 0A4 4 0 006.5 19.5z"
              stroke={fileError ? '#dc2626' : 'var(--color-primary)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 13v-5m0 0l-2.5 2.5M12 8l2.5 2.5"
              stroke={fileError ? '#dc2626' : 'var(--color-primary)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Drag your PDF here</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6 }}>or tap to browse</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>PDF only</div>
      </div>

      {fileError && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 13,
            border: '1px solid #fecaca',
          }}
        >
          {fileError}
        </div>
      )}

      {file && !fileError && (
        <div
          style={{
            marginTop: 20,
            padding: '16px 18px',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ecfdf3',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>{file.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{formatFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); reset(); }}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-danger, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                flexShrink: 0,
              }}
            >
              × Remove
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '16px 0 0', lineHeight: 1.5 }}>
            Scope monitoring will activate once your contract is processed
          </p>

          {processing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <div className="fos-spinner fos-spinner--on-light" style={{ width: 20, height: 20 }} aria-hidden />
              <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Processing contract…</span>
            </div>
          )}

          {!processing && !contractActive && (
            <button
              type="button"
              onClick={runPipeline}
              style={{
                marginTop: 14,
                padding: '12px 20px',
                borderRadius: 10,
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
              }}
            >
              Upload and Activate
            </button>
          )}
        </div>
      )}

      {projectId && (
        <div style={{ marginTop: 28, fontSize: 12, color: 'var(--color-text-3)' }}>
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
  );
}
