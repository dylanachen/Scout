export default function ThreadList({ projects, selectedId, onSelect }) {
  if (!projects?.length) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-3)' }}>
        No projects yet. Create one in the dashboard or wait for backend seed data.
      </div>
    );
  }

  return (
    <div style={{ width: 260, borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>
        Threads
      </div>
      {projects.map((p) => {
        const active = String(p.id) === String(selectedId ?? '');
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              border: 'none',
              borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
              background: active ? 'var(--color-surface-2)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{p.client_name ?? 'Client'}</div>
          </button>
        );
      })}
    </div>
  );
}
