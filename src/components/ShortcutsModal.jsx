const SECTIONS = [
  {
    title: 'Navigation',
    items: [
      { keys: ['g', 'd'], label: 'Go to Dashboard' },
      { keys: ['g', 'p'], label: 'Go to Projects' },
      { keys: ['g', 'm'], label: 'Go to Matches' },
      { keys: ['g', 'i'], label: 'Go to Invoices' },
      { keys: ['g', 'n'], label: 'Go to Notifications' },
      { keys: ['g', 's'], label: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { keys: ['⌘', 'K'], label: 'Command palette' },
      { keys: ['/'], label: 'Focus search' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close dialog' },
    ],
  },
];

export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="scout-cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(460px, 92vw)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: 18,
          boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-3)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {section.items.map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-2)' }}>{item.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 6,
                            padding: '2px 7px',
                            fontSize: 11,
                            fontFamily: 'var(--font-sans)',
                            color: 'var(--color-text)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
