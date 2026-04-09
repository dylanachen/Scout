import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    icon: '💬',
    heading: 'Find your perfect match through a conversation, not a form',
    description: 'Our AI interviews you like a human would — then finds clients who actually fit your style.',
    color: '#dbeafe',
    accent: '#1d6ecd',
  },
  {
    icon: '🛡️',
    heading: 'AI that watches your back while you work',
    description: 'Scope creep detection, smart contract monitoring, and suggested responses — all in real time.',
    color: '#fef3c7',
    accent: '#b45309',
  },
  {
    icon: '💰',
    heading: 'Protect your time, get paid what you\'re owed',
    description: 'Automatic time tracking, AI-drafted invoices, and built-in change orders so nothing falls through the cracks.',
    color: '#dcfce7',
    accent: '#16a34a',
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function OnboardingCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState('right');
  const [animating, setAnimating] = useState(false);
  const autoRef = useRef(null);

  const goTo = useCallback(
    (idx, dir) => {
      if (idx === current || animating) return;
      setDirection(dir || (idx > current ? 'right' : 'left'));
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 280);
    },
    [current, animating],
  );

  const next = useCallback(() => {
    if (current < SLIDES.length - 1) goTo(current + 1, 'right');
  }, [current, goTo]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1, 'left');
  }, [current, goTo]);

  useEffect(() => {
    autoRef.current = setTimeout(() => {
      if (current < SLIDES.length - 1) next();
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(autoRef.current);
  }, [current, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Touch/swipe support
  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip link — top right, hidden on last slide */}
      {!isLast && (
        <div style={{ padding: '20px 24px 0', textAlign: 'right', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/signup', { replace: true })}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-3)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              padding: '4px 8px',
            }}
          >
            Skip
          </button>
        </div>
      )}
      {isLast && <div style={{ height: 44, flexShrink: 0 }} />}

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          opacity: animating ? 0 : 1,
          transform: animating
            ? `translateX(${direction === 'right' ? '-40px' : '40px'})`
            : 'translateX(0)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}
      >
        {/* Illustration circle */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: slide.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            marginBottom: 36,
          }}
        >
          {slide.icon}
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 400,
            lineHeight: 1.3,
            letterSpacing: '-0.3px',
            margin: '0 0 14px',
            color: 'var(--color-text)',
          }}
        >
          {slide.heading}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: 'var(--color-text-3)',
            textAlign: 'center',
            maxWidth: 380,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {slide.description}
        </p>
      </div>

      {/* Bottom section: dots + buttons */}
      <div style={{ padding: '0 32px 48px', flexShrink: 0 }}>
        {/* Dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons — last slide */}
        {isLast ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
            <button
              type="button"
              onClick={() => navigate('/signup', { replace: true })}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                background: 'transparent',
                color: 'var(--color-primary)',
                border: '1.5px solid var(--color-primary)',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Log In
            </button>
          </div>
        ) : (
          <div style={{ height: 48 }} />
        )}
      </div>
    </div>
  );
}
