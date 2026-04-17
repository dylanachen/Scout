import { useState } from 'react';

export default function StakeholderInviteModal({ open, onClose, projectName, participants, isHost, onRemove }) {
  const [mode, setMode] = useState('email');
  const [value, setValue] = useState('');
  const [toast, setToast] = useState(null);

  if (!open) return null;

  const send = () => {
    if (!value.trim()) return;
    const target = value.trim();
    setValue('');
    setToast(`Invite sent to ${target}`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 210,
          background: 'rgba(15, 22, 35, 0.4)',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-heading"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 211,
          width: 'min(420px, calc(100vw - 32px))',
          maxHeight: 'min(90vh, 560px)',
          overflow: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(15, 22, 35, 0.15)',
          padding: '20px 20px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 id="invite-heading" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Invite to this project
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--color-text-3)',
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 12,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('email')}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              background: mode === 'email' ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: mode === 'email' ? '#fff' : 'var(--color-text)',
            }}
          >
            By email
          </button>
          <button
            type="button"
            onClick={() => setMode('platform')}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              background: mode === 'platform' ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: mode === 'platform' ? '#fff' : 'var(--color-text)',
            }}
          >
            By platform ID
          </button>
        </div>

        <label style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'block' }}>
          {mode === 'email' ? 'Email address' : 'Platform user ID'}
          <input
            type={mode === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'email' ? 'name@company.com' : 'e.g. user_abc123'}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 6,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />
        </label>

        <button
          type="button"
          onClick={send}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Send Invite
        </button>

        {toast && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 14px',
              borderRadius: 20,
              background: '#16a34a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'center',
              animation: 'scout-fade-in 0.25s ease',
            }}
          >
            {toast}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
            Current participants
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {participants.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: p.avatarColor || 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {p.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{p.role}</div>
                </div>
                {isHost && p.removable ? (
                  <button
                    type="button"
                    onClick={() => onRemove?.(p.id)}
                    style={{
                      fontSize: 11,
                      color: 'var(--color-danger)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
