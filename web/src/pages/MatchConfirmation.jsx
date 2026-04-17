import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Avatar({ name, url }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid var(--color-surface)',
          boxShadow: '0 2px 12px rgba(15, 22, 35, 0.12)',
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-surface-3), #dbe4f0)',
        border: '3px solid var(--color-surface)',
        boxShadow: '0 2px 12px rgba(15, 22, 35, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 26,
        color: 'var(--color-text-2)',
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function ConfettiBurst() {
  const pieces = [
    { left: '12%', delay: 0, color: '#fbbf24' },
    { left: '28%', delay: 0.05, color: '#34d399' },
    { left: '44%', delay: 0.1, color: '#60a5fa' },
    { left: '60%', delay: 0.08, color: '#f472b6' },
    { left: '76%', delay: 0.12, color: '#a78bfa' },
    { left: '88%', delay: 0.04, color: '#fb923c' },
  ];
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 120,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="scout-confetti-piece"
          style={{
            left: p.left,
            animationDelay: `${p.delay}s`,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

export default function MatchConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showBurst, setShowBurst] = useState(true);

  const projectName = state?.projectName ?? 'Website refresh';
  const projectSummary =
    state?.projectSummary ??
    'Logo refinement, component library, and landing page updates for the spring campaign.';

  const meName = state?.me?.name ?? user?.name ?? 'You';
  const meAvatar = state?.me?.avatarUrl ?? user?.avatar_url ?? null;
  const otherName = state?.other?.name ?? 'Jordan Kim';
  const otherAvatar = state?.other?.avatarUrl ?? null;

  useEffect(() => {
    const t = setTimeout(() => setShowBurst(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px 48px',
        position: 'relative',
      }}
    >
      {showBurst ? <ConfettiBurst /> : null}

      <div
        className="scout-match-check-wrap"
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 28px rgba(22, 163, 74, 0.35)',
        }}
      >
        <svg className="scout-match-check" width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          margin: '0 0 8px',
          letterSpacing: '-0.03em',
          textAlign: 'center',
        }}
      >
        It&apos;s a match!
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 28px', textAlign: 'center' }}>
        Your project chat is ready
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          marginBottom: 28,
          width: '100%',
          maxWidth: 340,
        }}
      >
        <Avatar name={meName} url={meAvatar} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
            minWidth: 48,
          }}
        >
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none" aria-hidden>
            <path d="M5 22l6-6h4l7-6 7 6h4l6 6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M15 16l7 5.5 7-5.5" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45"/>
          </svg>
        </div>
        <Avatar name={otherName} url={otherAvatar} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: -18, marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{meName}</span>
        <span style={{ margin: '0 8px' }}>&amp;</span>
        <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{otherName}</span>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Project
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}>{projectName}</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '10px 0 0', lineHeight: 1.5 }}>{projectSummary}</p>
      </div>

      <Link
        to="/chat"
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'block',
          textAlign: 'center',
          padding: '14px 20px',
          borderRadius: 10,
          background: 'var(--color-primary)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          marginBottom: 14,
        }}
      >
        Open Project Chat
      </Link>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '12px 20px',
          borderRadius: 10,
          border: '1px solid var(--color-primary)',
          background: 'transparent',
          color: 'var(--color-primary)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
