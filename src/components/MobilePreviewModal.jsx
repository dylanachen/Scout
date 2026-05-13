import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PRESETS = [
  { id: 'iphone-13', label: 'iPhone 13', w: 390, h: 844 },
  { id: 'iphone-se', label: 'iPhone SE', w: 375, h: 667 },
  { id: 'pixel-7', label: 'Pixel 7', w: 412, h: 915 },
  { id: 'galaxy-s8', label: 'Galaxy S8', w: 360, h: 740 },
];

export default function MobilePreviewModal({ open, onClose }) {
  const [presetId, setPresetId] = useState('iphone-13');
  const [rotated, setRotated] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => `${window.location.pathname}${window.location.search}`);
  const iframeRef = useRef(null);

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0], [presetId]);
  const w = rotated ? preset.h : preset.w;
  const h = rotated ? preset.w : preset.h;

  useEffect(() => {
    if (!open) return;
    setCurrentPath(`${window.location.pathname}${window.location.search}`);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Live clock for the faux status bar — refresh every 30s.
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  );
  useEffect(() => {
    if (!open) return;
    const tick = () => setClock(
      new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    );
    tick();
    const id = window.setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const reload = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  // Render via portal to <body> so the modal escapes the sidebar's stacking
  // context (`.nav-sidebar` has its own z-index, which would otherwise trap us
  // below the app's z-index:30 header).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile preview"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8, 12, 20, 0.7)',
        zIndex: 10080,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          padding: '8px 12px',
          borderRadius: 999,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          flexWrap: 'wrap',
          maxWidth: '92vw',
        }}
      >
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          aria-label="Device preset"
          style={{
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.w}×{p.h}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setRotated((v) => !v)}
          aria-label="Rotate"
          title="Rotate"
          style={pillBtn}
        >
          ⟳ Rotate
        </button>
        <button type="button" onClick={reload} aria-label="Reload" title="Reload" style={pillBtn}>
          ↻ Reload
        </button>
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-3)',
            fontWeight: 600,
            padding: '0 4px',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={currentPath}
        >
          {currentPath}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" style={{ ...pillBtn, color: 'var(--color-danger)' }}>
          ✕ Close
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: w + 24,
          height: h + 24,
          maxWidth: '92vw',
          maxHeight: '78vh',
          borderRadius: 44,
          padding: 12,
          background: 'linear-gradient(160deg, #1a2030 0%, #0a0e16 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 96,
            height: 22,
            background: '#0a0e16',
            borderRadius: 14,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 32,
            overflow: 'hidden',
            background: 'var(--color-surface)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Faux status bar — clock on the left, signal/wifi/battery on the right.
              Gives the notch room and keeps the iframe content from being clipped. */}
          <div
            style={{
              height: 36,
              flexShrink: 0,
              padding: '0 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span>{clock}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-2)' }}>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden>
                <rect x="0"  y="7"  width="2" height="4" rx="0.5" />
                <rect x="3"  y="5"  width="2" height="6" rx="0.5" />
                <rect x="6"  y="3"  width="2" height="8" rx="0.5" />
                <rect x="9"  y="1"  width="2" height="10" rx="0.5" />
                <rect x="12" y="0"  width="2" height="11" rx="0.5" opacity="0.45" />
              </svg>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M1 4.2a9 9 0 0112 0" strokeLinecap="round" />
                <path d="M3 6.6a6 6 0 018 0" strokeLinecap="round" />
                <circle cx="7" cy="9.2" r="1" fill="currentColor" stroke="none" />
              </svg>
              <span
                style={{
                  position: 'relative',
                  width: 22,
                  height: 11,
                  border: '1.2px solid currentColor',
                  borderRadius: 3,
                  display: 'inline-block',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 1.5,
                    left: 1.5,
                    bottom: 1.5,
                    width: '70%',
                    background: 'currentColor',
                    borderRadius: 1.5,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: -3,
                    top: 3,
                    width: 2,
                    height: 5,
                    background: 'currentColor',
                    borderRadius: '0 1px 1px 0',
                  }}
                />
              </span>
            </span>
          </div>
          <iframe
            ref={iframeRef}
            src={currentPath}
            title="Mobile preview"
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              display: 'block',
              background: 'var(--color-surface)',
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

const pillBtn = {
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-2)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};
