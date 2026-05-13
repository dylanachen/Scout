import DeliverableIcon from './DeliverableIcon';

export default function PortfolioItemCard({ item, onOpen }) {
  const desc = String(item.description || '').trim();
  const short =
    desc.length > 140 ? `${desc.slice(0, 137).trim()}…` : desc;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      style={{
        textAlign: 'left',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        background: 'var(--color-surface)',
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 280,
        transition: 'var(--transition)',
        boxShadow: '0 1px 0 rgba(15, 22, 35, 0.04)',
      }}
    >
      <div
        style={{
          height: 140,
          background: item.thumbnailDataUrl
            ? `url(${item.thumbnailDataUrl}) center/cover no-repeat`
            : 'var(--color-surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!item.thumbnailDataUrl ? <DeliverableIcon type={item.deliverableType} size={48} /> : null}
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{item.title}</div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{short}</p>
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(29, 110, 205, 0.1)',
            color: 'var(--color-primary)',
          }}
        >
          {item.deliverableType || 'Deliverable'}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
          {(item.skills || []).slice(0, 5).map((s) => (
            <span
              key={s}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-2)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
