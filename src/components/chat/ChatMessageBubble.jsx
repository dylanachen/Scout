const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function isImageType(mime, name = '') {
  if (mime && mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name || '');
}

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveAttachmentUrl(u) {
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${API_BASE}${u}`;
}

function Attachment({ msg, inverted }) {
  const url = resolveAttachmentUrl(msg.attachment_url);
  if (!url) return null;
  const name = msg.attachment_name || 'file';
  const mime = msg.attachment_type || '';
  const size = msg.attachment_size;
  const sizeLabel = humanSize(size);
  const isImg = isImageType(mime, name);

  if (isImg) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{
        display: 'block', marginTop: 6, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${inverted ? 'rgba(255,255,255,0.25)' : 'var(--color-border)'}`,
      }}>
        <img src={url} alt={name} style={{ display: 'block', maxWidth: 280, maxHeight: 260, width: '100%', objectFit: 'cover' }} />
      </a>
    );
  }

  const bg = inverted ? 'rgba(255,255,255,0.18)' : 'var(--color-surface)';
  const border = inverted ? 'rgba(255,255,255,0.3)' : 'var(--color-border)';
  const subColor = inverted ? 'rgba(255,255,255,0.75)' : 'var(--color-text-3)';
  return (
    <a href={url} target="_blank" rel="noreferrer" download={name}
      style={{
        marginTop: 6, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 10, background: bg,
        border: `1px solid ${border}`, textDecoration: 'none',
        color: inverted ? '#fff' : 'var(--color-text)',
      }}>
      <span style={{
        width: 28, height: 28, flexShrink: 0, borderRadius: 6,
        background: inverted ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <path d="M13 2v7h7" />
        </svg>
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {sizeLabel && <div style={{ fontSize: 10, color: subColor, marginTop: 1 }}>{sizeLabel}</div>}
      </span>
    </a>
  );
}

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', animation: 'scout-slide-right 0.3s ease' }}>
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
            {msg.attachment_url && <Attachment msg={msg} inverted />}
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
      <div style={{ display: 'flex', gap: 10, flexDirection: 'row', maxWidth: '100%', alignItems: 'flex-end', animation: 'scout-slide-left 0.3s ease' }}>
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
            {msg.attachment_url && <Attachment msg={msg} />}
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
      <div style={{ display: 'flex', gap: 10, flexDirection: 'row', maxWidth: '100%', alignItems: 'flex-end', animation: 'scout-slide-left 0.3s ease' }}>
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
    <div style={{ width: '100%', animation: 'scout-slide-left 0.3s ease' }}>
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
      title="Scout AI"
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
