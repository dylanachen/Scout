export default function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      style={{
        border: '1px solid #fca5a5',
        borderRadius: 10,
        background: '#fef2f2',
        color: '#991b1b',
        padding: 12,
      }}
    >
      <p style={{ margin: '0 0 8px' }}>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#b91c1c',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
