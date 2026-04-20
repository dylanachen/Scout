import { useId, useState } from 'react';

const inputStyle = {
  width: '100%',
  padding: '10px 40px 10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 9,
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
};

export default function PasswordField({
  label,
  value,
  onChange,
  error,
  onBlur,
  autoComplete,
  placeholder,
  id: idProp,
}) {
  const uid = useId();
  const id = idProp ?? `pw-${uid}`;
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          style={{
            ...inputStyle,
            borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-text-3)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? (
        <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '6px 0 0' }}>{error}</p>
      ) : null}
    </div>
  );
}
