export default function ToggleSwitch({ checked, onChange, disabled, id, label }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        padding: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--color-primary)' : 'var(--color-surface-3)',
        transition: 'background 0.15s ease',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'block',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  );
}
