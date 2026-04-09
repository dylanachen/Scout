export default function DeliverableIcon({ type, size = 40 }) {
  const t = String(type || '').toLowerCase();
  const isVideo = t.includes('video');
  const isUi = t.includes('ui') || t.includes('design');
  const stroke = 'var(--color-text-2)';

  if (isVideo) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M10 9l5 3-5 3V9z" fill={stroke} />
      </svg>
    );
  }
  if (isUi) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M8 8h8M8 12h5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke={stroke} strokeWidth="1.5" />
      <path d="M9 12h6M9 16h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
