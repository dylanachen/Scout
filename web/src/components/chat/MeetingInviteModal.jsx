import { useState } from 'react';
import { detectMeetingPlatform } from '../../utils/meetingStorage';

const PLATFORM_LABEL = { zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams' };

function PlatformIcons({ active }) {
  const wrap = (platformKey, children) => (
    <span
      key={platformKey}
      title={PLATFORM_LABEL[platformKey] ?? platformKey}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: active === platformKey ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
        background: 'var(--color-surface-2)',
        opacity: active && active !== platformKey ? 0.45 : 1,
      }}
      aria-hidden
    >
      {children}
    </span>
  );

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 12, marginBottom: 4 }}>
      {wrap(
        'zoom',
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="14" height="12" rx="2" stroke="#0E71EB" strokeWidth="2" />
          <path d="M17 10l4-2v8l-4-2v-4z" fill="#0E71EB" />
        </svg>,
      )}
      {wrap(
        'meet',
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 6L5 10v4l7 4 7-4v-4l-7-4z" fill="#34A853" />
          <path d="M5 10v4l7 4V14l-7-4z" fill="#FBBC04" />
          <path d="M12 6v8l7-4-7-4z" fill="#EA4335" />
          <path d="M12 14v4l7-4v-4l-7 4z" fill="#4285F4" />
        </svg>,
      )}
      {wrap(
        'teams',
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="8" height="8" rx="1" fill="#5059A9" />
          <rect x="13" y="4" width="8" height="8" rx="1" fill="#7B83EB" />
          <rect x="3" y="13" width="8" height="8" rx="1" fill="#4B53BC" />
          <rect x="13" y="13" width="8" height="8" rx="1" fill="#5059A9" />
        </svg>,
      )}
    </div>
  );
}

export default function MeetingInviteModal({ open, onClose, onInvite, projectName }) {
  const [link, setLink] = useState('');

  if (!open) return null;

  const platform = detectMeetingPlatform(link.trim());
  const activeIcon = platform === 'unknown' ? null : platform;

  const handleSend = () => {
    const u = link.trim();
    if (!u) return;
    onInvite?.({ link: u, platform: detectMeetingPlatform(u) });
    setLink('');
    onClose?.();
  };

  const handleBackdrop = () => {
    setLink('');
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={handleBackdrop}
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
        aria-labelledby="meeting-invite-heading"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h2 id="meeting-invite-heading" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Invite AI to your meeting
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>{projectName}</p>
          </div>
          <button
            type="button"
            onClick={handleBackdrop}
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

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block' }}>
          Paste your meeting link
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://zoom.us/j/… or Meet / Teams link"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />
        </label>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginTop: 14 }}>
          Supported platforms
        </div>
        <PlatformIcons active={activeIcon} />

        <button
          type="button"
          onClick={handleSend}
          disabled={!link.trim()}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '11px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: link.trim() ? 'pointer' : 'not-allowed',
            border: 'none',
            background: link.trim() ? 'var(--color-primary)' : 'var(--color-surface-3)',
            color: link.trim() ? '#fff' : 'var(--color-text-3)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Send AI Agent
        </button>

        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12, lineHeight: 1.45, textAlign: 'center' }}>
          FreelanceOS AI will join your call as a silent participant
        </p>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            type="button"
            onClick={handleBackdrop}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-3)',
              padding: '4px 8px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
