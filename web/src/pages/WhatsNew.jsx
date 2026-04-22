import { useNavigate } from 'react-router-dom';
import { CHANGELOG, APP_VERSION } from '../data/changelog';

export default function WhatsNew() {
  const navigate = useNavigate();
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>What&apos;s new</h1>
        <p style={{ margin: '4px 0 18px', color: 'var(--color-text-3)', fontSize: 13 }}>
          Scout {APP_VERSION} — latest improvements and changes.
        </p>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHANGELOG.map((entry) => (
            <li key={entry.version} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15 }}>{entry.title}</h2>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{entry.version} · {entry.date}</span>
              </div>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--color-text-2)', fontSize: 13 }}>
                {entry.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
