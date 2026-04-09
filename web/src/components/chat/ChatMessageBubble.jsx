/**
 * Chat bubbles: freelancer (right / primary), client (left / neutral + avatar),
 * stakeholder (left / purple avatar), AI public (left / teal), AI private (full-width amber card).
 */
export default function ChatMessageBubble({ msg, role, viewerRole, isGroupStart = true, receipt }) {
  const isPrivateAi = role === 'ai_private';
  if (isPrivateAi && viewerRole === 'client') {
    return null;
  }

  const timeStr = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  if (role === 'freelancer') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', animation: 'fos-slide-right 0.3s ease' }}>
        <div style={{ maxWidth: '78%' }}>
          <div
            style={{
              padding: '10px 13px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.55,
              background: 'var(--color-primary)',
              color: '#fff',
              borderTopRightRadius: isGroupStart ? 12 : 4,
            }}
          >
            {msg.text}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{timeStr}</span>
            {receipt && <ReadReceipt status={receipt} />}
          </div>
        </div>
      </div>
    );
  }

  if (role === 'client' || role === 'stakeholder') {
    const initials = msg.sender_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '•';
    const bgColor = role === 'stakeholder' ? '#7c3aed' : '#64748b';
    return (
      <div style={{ display: 'flex', gap: 10, flexDirection: 'row', maxWidth: '100%', alignItems: 'flex-end', animation: 'fos-slide-left 0.3s ease' }}>
        {isGroupStart ? <Avatar initials={initials} bg={bgColor} /> : <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{ maxWidth: '72%' }}>
          {isGroupStart && (
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>
              {msg.sender_name} · {timeStr}
            </div>
          )}
          <div
            style={{
              padding: '10px 13px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.55,
              background: 'var(--color-client-bubble)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderTopLeftRadius: isGroupStart ? 4 : 12,
            }}
          >
            {msg.text}
          </div>
          {!isGroupStart && (
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>{timeStr}</div>
          )}
        </div>
      </div>
    );
  }

  if (role === 'ai_public') {
    return (
      <div style={{ display: 'flex', gap: 10, flexDirection: 'row', maxWidth: '100%', alignItems: 'flex-end', animation: 'fos-slide-left 0.3s ease' }}>
        {isGroupStart ? <AiAvatar /> : <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{ maxWidth: '78%' }}>
          {isGroupStart && (
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>
              {msg.sender_name} · {timeStr}
            </div>
          )}
          <div
            style={{
              padding: '10px 13px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.55,
              background: 'var(--color-ai-public-bg)',
              color: 'var(--color-ai-public-text)',
              border: '1px solid var(--color-ai-public-border)',
              borderTopLeftRadius: isGroupStart ? 4 : 12,
            }}
          >
            {msg.text}
          </div>
          {!isGroupStart && (
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>{timeStr}</div>
          )}
        </div>
      </div>
    );
  }

  /* ai_private — full-width amber/yellow card */
  return (
    <div style={{ width: '100%', animation: 'fos-slide-left 0.3s ease' }}>
      <div
        style={{
          borderLeft: '4px solid var(--color-scope-border)',
          background: 'var(--color-scope-bg)',
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          Only you can see this
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AiAvatarSmall />
          <span>{msg.sender_name} (Private) · {timeStr}</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function ReadReceipt({ status }) {
  if (!status) return null;
  if (status === 'sent') {
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block' }}>
        <path d="M1 5l3.5 3.5L13 1" stroke="#9aa0ae" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const color = status === 'read' ? 'var(--color-primary)' : '#9aa0ae';
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ display: 'block' }}>
      <path d="M1 5l3.5 3.5L11 1" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5l3.5 3.5L15 1" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ initials, bg }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function AiAvatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'var(--color-ai-avatar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
      title="FreelanceOS AI"
    >
      AI
    </div>
  );
}

function AiAvatarSmall() {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--color-ai-avatar)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 7,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      AI
    </div>
  );
}
