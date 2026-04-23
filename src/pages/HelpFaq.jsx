const FAQS = [
  {
    q: 'How do I start a new project?',
    a: 'Go to Projects and use the New project action.',
  },
  {
    q: 'How do I update notification settings?',
    a: 'Open Settings and choose Notification Preferences.',
  },
  {
    q: 'How do bookmarks work?',
    a: 'Bookmarked project IDs are saved locally on this device.',
  },
];

export default function HelpFaq() {
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <h1>Help & FAQ</h1>
      <p>Quick answers for common tasks in Scout.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {FAQS.map((item) => (
          <article
            key={item.q}
            style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, background: 'var(--color-surface)' }}
          >
            <h3 style={{ margin: '0 0 6px' }}>{item.q}</h3>
            <p style={{ margin: 0, color: 'var(--color-text-2)' }}>{item.a}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
