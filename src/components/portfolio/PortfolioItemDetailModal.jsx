import DeliverableIcon from './DeliverableIcon';

export default function PortfolioItemDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pf-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(15, 22, 35, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          maxHeight: 'min(90vh, 720px)',
          overflow: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(15, 22, 35, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 220,
            background: item.thumbnailDataUrl
              ? `url(${item.thumbnailDataUrl}) center/cover no-repeat`
              : 'var(--color-surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {!item.thumbnailDataUrl ? <DeliverableIcon type={item.deliverableType} size={64} /> : null}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.95)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ padding: '20px 22px 24px' }}>
          <h2 id="pf-detail-title" style={{ margin: '0 0 8px', fontSize: 22, letterSpacing: '-0.03em' }}>
            {item.title}
          </h2>
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(29, 110, 205, 0.1)',
              color: 'var(--color-primary)',
            }}
          >
            {item.deliverableType || 'Deliverable'}
          </span>
          <p style={{ margin: '16px 0 0', fontSize: 15, color: 'var(--color-text-2)', lineHeight: 1.65 }}>
            {item.description}
          </p>
          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(item.skills || []).map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
