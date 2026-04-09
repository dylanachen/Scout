import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function initials(user) {
  const n = String(user?.name ?? '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '';
    return (a + b).toUpperCase() || '?';
  }
  const e = String(user?.email ?? '').trim();
  if (e) return e[0].toUpperCase();
  return '?';
}

export default function UserNavMenu({ variant = 'sidebar' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const display = user?.name?.trim() || user?.email || 'Account';
  const compact = variant === 'compact';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 8 : 10,
          width: compact ? 'auto' : '100%',
          padding: compact ? '6px 8px' : '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
        }}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            width={compact ? 32 : 40}
            height={compact ? 32 : 40}
            style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <span
            style={{
              width: compact ? 32 : 40,
              height: compact ? 32 : 40,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials(user)}
          </span>
        )}
        {!compact && (
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {display}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.role === 'client' ? 'Client' : 'Freelancer'}
            </span>
          </span>
        )}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, opacity: 0.55 }}>
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            left: compact ? 'auto' : 0,
            right: compact ? 0 : 0,
            top: 'calc(100% + 6px)',
            minWidth: compact ? 180 : undefined,
            padding: 6,
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            boxShadow: '0 10px 30px rgba(15,22,35,0.12)',
            zIndex: 1000,
          }}
        >
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text)',
              textDecoration: 'none',
            }}
          >
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-danger)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
