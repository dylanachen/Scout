function compactTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((dayStart(new Date(now)) - dayStart(d)) / 86400000);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function sortKey(p) {
  // Prefer the last message timestamp; fall back to project creation so empty threads
  // still get a sensible ordering instead of all collapsing to the bottom.
  const t = p?.last_message_at || p?.created_at;
  const n = t ? new Date(t).getTime() : 0;
  return Number.isFinite(n) ? n : 0;
}

export default function ThreadList({ projects, selectedId, onSelect }) {
  if (!projects?.length) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-3)' }}>
        No projects yet. Create one in the dashboard or wait for backend seed data.
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => sortKey(b) - sortKey(a));

  return (
    <div style={{ width: 260, borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>
        Threads
      </div>
      {sorted.map((p) => {
        const active = String(p.id) === String(selectedId ?? '');
        const time = compactTime(p.last_message_at);
        const preview = p.last_message_text || p.client_name || 'No messages yet';
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
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </div>
              {time && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-3)',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {time}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-3)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {preview}
            </div>
          </button>
        );
      })}
    </div>
  );
}
