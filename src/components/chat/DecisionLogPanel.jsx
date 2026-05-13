import { useState } from 'react';

const TAG_STYLES = {
  Approval: { bg: '#ecfdf3', color: '#166534' },
  'Scope Agreement': { bg: '#eff6ff', color: '#1d4ed8' },
  'Deadline Commitment': { bg: '#fff7ed', color: '#c2410c' },
  Other: { bg: 'var(--color-surface-3)', color: 'var(--color-text-2)' },
};

const SOURCE_STYLES = {
  chat: { bg: '#eff6ff', color: '#1d4ed8', label: 'From chat' },
  meeting: { bg: '#f3f0ff', color: '#5b21b6', label: 'From meeting' },
};

const FILTERS = ['All', 'Approvals', 'Scope Agreements', 'Deadlines', 'Other'];

const FILTER_TAG_MAP = {
  Approvals: 'Approval',
  'Scope Agreements': 'Scope Agreement',
  Deadlines: 'Deadline Commitment',
  Other: 'Other',
};

function formatTag(tag) {
  const t = TAG_STYLES[tag] ?? TAG_STYLES.Other;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
        background: t.bg,
        color: t.color,
      }}
    >
      {tag}
    </span>
  );
}

function formatSource(source) {
  const s = SOURCE_STYLES[source] ?? SOURCE_STYLES.chat;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function whoInitials(who) {
  if (!who) return '?';
  const first = who.split(',')[0].trim();
  return first
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DecisionLogPanel({
  open,
  onClose,
  projectName,
  entries,
  onAddEntry,
  isMobile,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', parties: '', description: '' });
  const [activeFilter, setActiveFilter] = useState('All');

  if (!open) return null;

  const filtered =
    activeFilter === 'All'
      ? entries
      : entries.filter((e) => e.tag === FILTER_TAG_MAP[activeFilter]);

  const panelStyle = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(400px, 100vw)',
        zIndex: 200,
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-8px 0 32px rgba(15, 22, 35, 0.08)',
        display: 'flex',
        flexDirection: 'column',
      };

  const submitManual = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    onAddEntry?.({
      id: `dec-${Date.now()}`,
      at: form.date || new Date().toISOString(),
      who: form.parties || 'You',
      summary: form.description.trim(),
      tag: 'Other',
      source: 'chat',
    });
    setForm({ date: '', parties: '', description: '' });
    setShowForm(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close decision log"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 199,
          background: 'rgba(0,0,0,0.3)',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <aside style={panelStyle}>
        {/* Header */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--color-text-3)',
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Decision Log</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{projectName}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
              {entries.length} decision{entries.length !== 1 ? 's' : ''} logged
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '5px 10px',
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                border: '1px solid',
                borderColor: activeFilter === f ? 'var(--color-primary)' : 'var(--color-border)',
                background: activeFilter === f ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeFilter === f ? '#fff' : 'var(--color-text-2)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {[...filtered]
            .sort((a, b) => new Date(a.at) - new Date(b.at))
            .map((e) => (
              <div
                key={e.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--color-surface-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--color-text-2)',
                      flexShrink: 0,
                    }}
                  >
                    {whoInitials(e.who)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                    {new Date(e.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {e.who}
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>{e.summary}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {formatTag(e.tag)}
                  {formatSource(e.source || 'chat')}
                </div>
              </div>
            ))}
        </div>

        {/* Pinned bottom: Log a Decision Manually */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--color-primary)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Log a Decision Manually
          </button>
          {showForm ? (
            <form onSubmit={submitManual} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </label>
              <label style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                Parties involved
                <input
                  type="text"
                  value={form.parties}
                  onChange={(e) => setForm((f) => ({ ...f, parties: e.target.value }))}
                  placeholder="e.g. You, Jordan"
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </label>
              <label style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                What was agreed
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="One sentence summary"
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Save entry
              </button>
            </form>
          ) : null}
        </div>
      </aside>
    </>
  );
}
