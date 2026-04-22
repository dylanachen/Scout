import { useEffect, useState } from 'react';
import { lsRead, lsSubscribe, lsWrite } from '../utils/localStore';
import { showToast } from '../utils/toast';
import EmptyState from '../components/EmptyState';

const KEY = 'scout_payment_methods';

function luhnValid(num) {
  const s = String(num).replace(/\s+/g, '');
  if (!/^\d{12,19}$/.test(s)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function detectBrand(num) {
  const s = String(num).replace(/\s+/g, '');
  if (/^4/.test(s)) return 'Visa';
  if (/^5[1-5]/.test(s)) return 'Mastercard';
  if (/^3[47]/.test(s)) return 'Amex';
  if (/^6(?:011|5)/.test(s)) return 'Discover';
  return 'Card';
}

function readMethods() {
  return lsRead(KEY, []);
}

function writeMethods(list) {
  lsWrite(KEY, list);
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState(() => readMethods());
  const [open, setOpen] = useState(false);

  useEffect(() => lsSubscribe(KEY, () => setMethods(readMethods())), []);

  const add = (card) => {
    const next = [...methods.map((m) => ({ ...m, default: false })), { ...card, id: `pm_${Date.now()}`, default: true, createdAt: new Date().toISOString() }];
    writeMethods(next);
    setMethods(next);
    setOpen(false);
    showToast('Payment method added (demo)', 'success');
  };

  const makeDefault = (id) => {
    const next = methods.map((m) => ({ ...m, default: m.id === id }));
    writeMethods(next);
    setMethods(next);
  };

  const remove = (id) => {
    const next = methods.filter((m) => m.id !== id);
    writeMethods(next);
    setMethods(next);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Payment methods</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            Demo only — no network request is made. Card numbers are validated client-side (Luhn) and stored masked.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} style={primaryBtn}>
          Add card
        </button>
      </div>

      {methods.length === 0 ? (
        <EmptyState title="No payment methods" body="Add a card to see how the payment method flow looks." actionLabel="Add card" onAction={() => setOpen(true)} />
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {methods.map((m) => (
            <li key={m.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {m.brand} •••• {m.last4}
                  {m.default ? <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>Default</span> : null}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>Exp {m.expMonth}/{m.expYear} · {m.holderName}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!m.default ? (
                  <button type="button" onClick={() => makeDefault(m.id)} style={secondaryBtn}>
                    Make default
                  </button>
                ) : null}
                <button type="button" onClick={() => remove(m.id)} style={{ ...secondaryBtn, color: 'var(--color-danger)' }}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? <AddCardModal onClose={() => setOpen(false)} onSubmit={add} /> : null}
    </div>
  );
}

function AddCardModal({ onClose, onSubmit }) {
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const clean = number.replace(/\s+/g, '');
    if (!luhnValid(clean)) {
      setError('Invalid card number.');
      return;
    }
    const [m, y] = exp.split('/').map((s) => s.trim());
    if (!/^\d{1,2}$/.test(m) || !/^\d{2,4}$/.test(y || '')) {
      setError('Invalid expiry (MM/YY).');
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setError('Invalid CVC.');
      return;
    }
    onSubmit({
      brand: detectBrand(clean),
      last4: clean.slice(-4),
      expMonth: m.padStart(2, '0'),
      expYear: y.length === 2 ? `20${y}` : y,
      holderName: name,
    });
  };

  return (
    <div className="scout-cmdk-overlay" role="dialog" aria-modal="true" aria-label="Add payment method" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} style={{ width: 'min(460px, 92vw)', background: 'var(--color-surface)', borderRadius: 14, padding: 20, border: '1px solid var(--color-border)' }}>
        <h2 style={{ marginTop: 0 }}>Add card</h2>
        <Field label="Card number">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="4242 4242 4242 4242"
            style={fieldStyle}
            inputMode="numeric"
            autoComplete="cc-number"
          />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Expiry (MM/YY)">
            <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="12/28" style={fieldStyle} inputMode="numeric" autoComplete="cc-exp" />
          </Field>
          <Field label="CVC">
            <input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} placeholder="123" style={fieldStyle} inputMode="numeric" autoComplete="cc-csc" />
          </Field>
        </div>
        <Field label="Name on card">
          <input value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} autoComplete="cc-name" />
        </Field>
        {error ? <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 0 }}>{error}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button type="submit" style={primaryBtn}>Save card</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10, flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
};

const primaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
