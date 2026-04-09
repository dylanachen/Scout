import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AccountScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch {
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  const name = user.name?.trim() || '—';
  const email = user.email?.trim() || '—';
  const avatarUrl = user.avatar_url;
  const initial = (name && name !== '—') ? name[0].toUpperCase() : '?';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--color-text-2)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <span aria-hidden>←</span> Settings
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Account</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 24 }}>
        Profile details, password, and session.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          marginBottom: 16,
        }}
      >
        {avatarUrl ? (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: `url(${avatarUrl}) center/cover`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', wordBreak: 'break-all' }}>{email}</div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <Link
          to="/settings/profile"
          state={{ focus: 'name' }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 18px',
            borderBottom: '1px solid var(--color-border)',
            textDecoration: 'none',
            color: 'inherit',
            background: 'var(--color-surface)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4 }}>Name</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
          </div>
          <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Edit</span>
        </Link>
        <Link
          to="/settings/profile"
          state={{ focus: 'email' }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 18px',
            textDecoration: 'none',
            color: 'inherit',
            background: 'var(--color-surface)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>{email}</div>
          </div>
          <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Edit</span>
        </Link>
      </div>

      <Link
        to="/settings/profile"
        style={{
          display: 'block',
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-primary)',
          textDecoration: 'none',
          background: 'var(--color-surface)',
        }}
      >
        Edit Profile
      </Link>

      <Link
        to="/settings/profile?expand=password"
        style={{
          display: 'block',
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-primary)',
          textDecoration: 'none',
          background: 'var(--color-surface)',
        }}
      >
        Change password →
      </Link>

      <button
        type="button"
        onClick={() => logout()}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 9,
          border: 'none',
          background: 'transparent',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-2)',
          marginBottom: 32,
        }}
      >
        Log out
      </button>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 9,
            border: '1px solid rgba(220, 38, 38, 0.35)',
            background: 'rgba(220, 38, 38, 0.06)',
            color: 'var(--color-danger)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Delete account
        </button>
      </div>

      {deleteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="acct-del-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,22,35,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2 id="acct-del-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
              Delete your account?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              This will permanently delete your account and all project data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: deleteLoading ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {deleteLoading ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
