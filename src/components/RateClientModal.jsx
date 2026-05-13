import { useEffect, useMemo, useState } from 'react';
import { submitClientRating } from '../utils/clientReputationStorage';

const CATEGORIES = [
  { key: 'assetDelivery', label: 'Asset delivery timeliness', question: 'Did they send what you needed, when you needed it?' },
  { key: 'communication', label: 'Communication quality', question: 'Were they responsive and clear?' },
  { key: 'scopeRespect', label: 'Scope respect', question: 'Did they stay within the agreed project scope?' },
  { key: 'paymentSpeed', label: 'Payment speed', question: 'Did they pay on time?' },
];

function StarRow({ value, onChange, label, question }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{label}</div>
      {question && (
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8, lineHeight: 1.4 }}>{question}</div>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={active}
              style={{
                padding: 4,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1,
                color: active ? '#f59e0b' : 'var(--color-surface-3)',
                filter: active ? 'none' : 'grayscale(1)',
                opacity: active ? 1 : 0.45,
                fontFamily: 'var(--font-sans)',
              }}
            >
              ★
            </button>
          );
        })}
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 4 }}>{value}/5</span>
      </div>
    </div>
  );
}

export default function RateClientModal({
  open,
  embedded,
  clientName,
  clientKey,
  projectId,
  onClose,
  onSkip,
  onSubmitted,
}) {
  const [assetDelivery, setAssetDelivery] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [scopeRespect, setScopeRespect] = useState(5);
  const [paymentSpeed, setPaymentSpeed] = useState(5);
  const [notes, setNotes] = useState('');

  const setters = {
    assetDelivery: setAssetDelivery,
    communication: setCommunication,
    scopeRespect: setScopeRespect,
    paymentSpeed: setPaymentSpeed,
  };

  useEffect(() => {
    if (!open && !embedded) return;
    setAssetDelivery(5);
    setCommunication(5);
    setScopeRespect(5);
    setPaymentSpeed(5);
    setNotes('');
  }, [open, embedded, projectId]);

  const overall = useMemo(
    () => (assetDelivery + communication + scopeRespect + paymentSpeed) / 4,
    [assetDelivery, communication, scopeRespect, paymentSpeed],
  );

  if (!open && !embedded) return null;

  const name = clientName?.trim() || 'this client';

  const handleSubmit = () => {
    submitClientRating({
      projectId,
      clientKey,
      assetDelivery,
      communication,
      scopeRespect,
      paymentSpeed,
      notes,
    });
    onSubmitted?.();
    onClose?.();
  };

  const inner = (
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--color-surface)',
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          boxShadow: embedded ? '0 1px 2px rgba(15, 22, 35, 0.04)' : '0 20px 50px rgba(15, 22, 35, 0.18)',
          padding: '24px 22px 20px',
          maxHeight: embedded ? 'none' : 'min(92vh, 720px)',
          overflowY: 'auto',
        }}
      >
        <h2
          id="rate-client-title"
          style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.25 }}
        >
          How was working with {name}?
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '0 0 18px', lineHeight: 1.45 }}>
          Private — your ratings are never shown to the client. They are aggregated into a reputation score for other
          freelancers.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {CATEGORIES.map((c) => (
            <StarRow
              key={c.key}
              label={c.label}
              question={c.question}
              value={
                c.key === 'assetDelivery'
                  ? assetDelivery
                  : c.key === 'communication'
                    ? communication
                    : c.key === 'scopeRespect'
                      ? scopeRespect
                      : paymentSpeed
              }
              onChange={setters[c.key]}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          Overall: {overall.toFixed(2)} / 5
        </div>

        <label style={{ display: 'block', marginTop: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
            Anything future freelancers should know? <span style={{ fontWeight: 500, color: 'var(--color-text-3)' }}>(optional)</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. briefs were thorough; invoicing was slow."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              minHeight: 72,
            }}
          />
        </label>

        <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '12px 0 0', lineHeight: 1.4 }}>
          Notes are stored privately for product improvement; they are not shared with the client.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Submit rating
          </button>
          <button
            type="button"
            onClick={() => {
              onSkip?.();
              onClose?.();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-2)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-client-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(15, 22, 35, 0.45)',
        overflowY: 'auto',
      }}
    >
      {inner}
    </div>
  );
}
