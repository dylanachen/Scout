export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        AI
      </div>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          borderTopLeftRadius: 4,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          gap: 5,
          alignItems: 'center',
        }}
        aria-label="Assistant is typing"
      >
        <span className="fos-typing-dot" />
        <span className="fos-typing-dot" style={{ animationDelay: '0.15s' }} />
        <span className="fos-typing-dot" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}
