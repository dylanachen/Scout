export default function EmptyState({ title, message, action }) {
  return (
    <div
      style={{
        border: '1px dashed var(--color-border)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        color: 'var(--color-text)',
      }}
    >
      <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>{message}</p>
      {action}
    </div>
  );
}
