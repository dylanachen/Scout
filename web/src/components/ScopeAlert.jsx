/**
 * ScopeAlert — private AI Scope Guardian notification (freelancer-only in product).
 */
export default function ScopeAlert({ alert, onDismiss }) {
  const { id, message, suggested_reply, contract_clause } = alert;

  const dismiss = () => onDismiss?.(id);

  return (
    <div
      style={{
        margin: '4px 0',
        padding: '12px 14px',
        background: 'var(--color-scope-bg)',
        border: '1px solid var(--color-scope-border)',
        borderLeft: '3px solid var(--color-scope)',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 18,
            height: 18,
            background: 'var(--color-scope)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          !
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.6px',
            color: 'var(--color-scope)',
            flex: 1,
          }}
        >
          AI Scope Guardian · Private
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-scope-text)', lineHeight: 1.55, marginBottom: 10 }}>{message}</p>

      {contract_clause && (
        <div
          style={{
            fontSize: 11,
            background: 'rgba(255,255,255,.6)',
            border: '1px solid var(--color-scope-border)',
            borderRadius: 6,
            padding: '6px 10px',
            marginBottom: 10,
            color: 'var(--color-scope-text)',
          }}
        >
          <strong>Contract ref:</strong> {contract_clause}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggested_reply && (
          <ScopeBtn type="button" onClick={() => navigator.clipboard?.writeText(suggested_reply)}>
            Copy suggested reply
          </ScopeBtn>
        )}
        <ScopeBtn type="button">Draft change order</ScopeBtn>
        <ScopeBtn type="button">Log decision</ScopeBtn>
        {onDismiss && (
          <ScopeBtn type="button" onClick={dismiss}>
            Dismiss
          </ScopeBtn>
        )}
      </div>
    </div>
  );
}

function ScopeBtn({ children, primary, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        border: '1px solid var(--color-scope-border)',
        background: primary ? 'var(--color-scope)' : 'var(--color-surface)',
        color: primary ? '#fff' : 'var(--color-scope)',
        transition: 'background var(--transition)',
      }}
    >
      {children}
    </button>
  );
}
