import { useEffect, useState } from 'react';
import { addTestimonialSubmission } from '../../utils/testimonialStorage';
import { useAuth } from '../../hooks/useAuth';

const SUB_CATEGORIES = [
  { key: 'communication', label: 'Communication' },
  { key: 'qualityOfWork', label: 'Quality of work' },
  { key: 'metDeadlines', label: 'Met deadlines' },
  { key: 'wouldHireAgain', label: 'Would hire again' },
];

function SubRatingRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-2)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }} role="group" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              color: n <= value ? '#f59e0b' : 'var(--color-surface-3)',
              opacity: n <= value ? 1 : 0.4,
              padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ClientTestimonialModal({ open, freelancerName, freelancerId, projectId, clientName, onClose, onSkip, onSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [subRatings, setSubRatings] = useState({ communication: 5, qualityOfWork: 5, metDeadlines: 5, wouldHireAgain: 5 });
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(5);
    setSubRatings({ communication: 5, qualityOfWork: 5, metDeadlines: 5, wouldHireAgain: 5 });
    setText('');
    setSubmitted(false);
  }, [open, projectId]);

  if (!open) return null;

  const updateSubRating = (key, value) => {
    setSubRatings((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    addTestimonialSubmission({
      freelancerId,
      freelancerName,
      projectId,
      rating,
      subRatings,
      text,
      clientName: user?.name || clientName,
    });
    onSubmitted?.();
    setSubmitted(true);
    window.setTimeout(() => onClose?.(), 2200);
  };

  if (submitted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 220,
          background: 'rgba(15, 22, 35, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            padding: '28px 32px',
            borderRadius: 16,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }} aria-hidden>
            ✓
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Thank you</p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Your testimonial was submitted. After a quick review it will appear on {freelancerName}&apos;s public profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tst-heading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: 'rgba(15, 22, 35, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          padding: '22px 22px 20px',
          boxShadow: '0 24px 48px rgba(15, 22, 35, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 id="tst-heading" style={{ margin: '0 0 14px', fontSize: 20, letterSpacing: '-0.03em' }}>
          How was working with {freelancerName}?
        </h2>

        <div style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Overall rating</span>
          <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Overall star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-pressed={rating === n}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: rating >= n ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: rating >= n ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface-2)',
                  cursor: 'pointer',
                  fontSize: 22,
                  lineHeight: 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 18,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          {SUB_CATEGORIES.map((cat) => (
            <SubRatingRow
              key={cat.key}
              label={cat.label}
              value={subRatings[cat.key]}
              onChange={(v) => updateSubRating(cat.key, v)}
            />
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tell them what you loved (optional)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="What stood out about communication, quality, or delivery?"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'vertical',
            marginBottom: 18,
            fontFamily: 'var(--font-sans)',
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={submit}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
