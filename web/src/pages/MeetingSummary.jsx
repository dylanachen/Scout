import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMeetingSummary } from '../utils/meetingStorage';
import { appendExtraDecision } from '../utils/decisionsStorage';

const SEVERITY_STYLES = {
  LOW: { color: 'var(--color-severity-low)', bg: 'var(--color-severity-low-bg)' },
  MEDIUM: { color: 'var(--color-severity-med)', bg: 'var(--color-severity-med-bg)' },
  HIGH: { color: 'var(--color-severity-high)', bg: 'var(--color-severity-high-bg)' },
};

function formatCallWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

function CollapsibleHeading({ title, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: 'none',
        padding: '0 0 12px',
        margin: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-text)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-3)' }} aria-hidden>{open ? '▾' : '▸'}</span>
    </button>
  );
}

export default function MeetingSummary() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const summary = useMemo(() => getMeetingSummary(projectId), [projectId]);

  const [dismissed, setDismissed] = useState(() => new Set());
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');

  const [decisionsOpen, setDecisionsOpen] = useState(true);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [deadlinesOpen, setDeadlinesOpen] = useState(true);

  const [checkedItems, setCheckedItems] = useState(() => new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState('');
  const [editedTexts, setEditedTexts] = useState({});

  if (!summary) {
    return (
      <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>No meeting summary for this project yet.</p>
        <Link to="/chat" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
          Back to chat
        </Link>
      </div>
    );
  }

  const decisions = (summary.decisions ?? []).filter((d) => !dismissed.has(d.id));
  const scopeFlags = (summary.scopeFlags ?? []).filter((s) => !dismissed.has(s.id));
  const actionItems = (summary.actionItems ?? []).filter((a) => !dismissed.has(a.id));
  const deadlines = (summary.deadlinesDiscussed ?? []).filter((x) => !dismissed.has(x.id));

  const logDecision = (item, tag = 'Other') => {
    appendExtraDecision(projectId, {
      id: `from-meeting-${item.id}-${Date.now()}`,
      at: new Date().toISOString(),
      who: 'Meeting summary',
      summary: item.text ?? item.task ?? item.label ?? '',
      tag,
    });
    setDismissed((s) => new Set(s).add(item.id));
  };

  const logAllDecisions = () => {
    decisions.forEach((d) => {
      appendExtraDecision(projectId, {
        id: `from-meeting-${d.id}-${Date.now()}`,
        at: new Date().toISOString(),
        who: 'Meeting summary',
        summary: d.text,
        tag: 'Approval',
      });
    });
    setDismissed((s) => {
      const n = new Set(s);
      decisions.forEach((d) => n.add(d.id));
      return n;
    });
  };

  const dismiss = (id) => setDismissed((s) => new Set(s).add(id));

  const toggleCheck = (id) => {
    setCheckedItems((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const filteredTranscript = useMemo(() => {
    const raw = summary.transcript ?? 'No transcript available.';
    if (!transcriptSearch.trim()) return raw;
    const q = transcriptSearch.trim().toLowerCase();
    const lines = raw.split('\n');
    const filtered = lines.filter((l) => l.toLowerCase().includes(q));
    return filtered.length ? filtered.join('\n') : `No transcript lines matching "${transcriptSearch.trim()}"`;
  }, [summary.transcript, transcriptSearch]);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Meeting Summary</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{formatCallWhen(summary.callStartedAt)}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          {decisions.length > 0 ? (
            <button
              type="button"
              onClick={logAllDecisions}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Log All Decisions
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Done
          </button>
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 24px' }}>
        Duration:{' '}
        <strong style={{ color: 'var(--color-text)' }}>
          {summary.durationMinutes != null ? `${summary.durationMinutes} min` : '—'}
        </strong>
      </p>

      {/* Key Decisions */}
      <section style={{ marginBottom: 28 }}>
        <CollapsibleHeading title="Key Decisions" open={decisionsOpen} onToggle={() => setDecisionsOpen((v) => !v)} />
        {decisionsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {decisions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>No decisions to show.</p>
            ) : (
              decisions.map((d) => (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
                    <span style={{ fontWeight: 600 }}>{d.who ?? 'Participant'}</span>
                    {d.timestamp && <span>· {d.timestamp}</span>}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 12px', color: 'var(--color-text)' }}>{d.text}</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => dismiss(d.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-2)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => logDecision(d, 'Approval')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Log to Project
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Scope Flags */}
      <section style={{ marginBottom: 28 }}>
        <CollapsibleHeading title="Scope Flags" open={scopeOpen} onToggle={() => setScopeOpen((v) => !v)} />
        {scopeOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scopeFlags.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>No scope flags from this call.</p>
            ) : (
              scopeFlags.map((f) => {
                const sev = (f.severity || 'MEDIUM').toUpperCase();
                const st = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.MEDIUM;
                return (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid var(--color-ai-private-border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      background: 'var(--color-ai-private-bg)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Scope Flag</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '3px 8px',
                          borderRadius: 6,
                          color: st.color,
                          background: st.bg,
                        }}
                      >
                        {sev}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 8px', color: 'var(--color-text)' }}>{f.explanation}</p>
                    {f.contract_clause ? (
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          marginBottom: 12,
                          color: 'var(--color-text-2)',
                        }}
                      >
                        {f.contract_clause}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => dismiss(f.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => logDecision({ id: f.id, text: f.explanation }, 'Other')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Log to Project
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Action Items */}
      <section style={{ marginBottom: 28 }}>
        <CollapsibleHeading title="Action Items" open={actionsOpen} onToggle={() => setActionsOpen((v) => !v)} />
        {actionsOpen && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actionItems.length === 0 ? (
              <li style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No action items captured.</li>
            ) : (
              actionItems.map((a) => {
                const checked = checkedItems.has(a.id);
                return (
                  <li
                    key={a.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      background: 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      opacity: checked ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheck(a.id)}
                      style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
                      aria-label={`Mark "${a.task}" as done`}
                    />
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', textDecoration: checked ? 'line-through' : 'none' }}>
                        {editingItem === a.id ? (
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => { setEditedTexts((p) => ({ ...p, [a.id]: editText })); setEditingItem(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setEditedTexts((p) => ({ ...p, [a.id]: editText })); setEditingItem(null); } }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--color-border)',
                              fontSize: 14,
                              fontFamily: 'var(--font-sans)',
                            }}
                          />
                        ) : (
                          editedTexts[a.id] ?? a.task
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>
                        Owner:{' '}
                        <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>
                          {a.owner === 'client' ? 'Client' : 'Freelancer'}
                        </span>
                        {a.due ? (
                          <>
                            {' '}
                            · Due: <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{a.due}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(a.id);
                        setEditText(a.task);
                      }}
                      title="Edit"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: 'var(--color-text-3)',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </section>

      {/* Deadlines Discussed */}
      <section style={{ marginBottom: 28 }}>
        <CollapsibleHeading title="Deadlines Discussed" open={deadlinesOpen} onToggle={() => setDeadlinesOpen((v) => !v)} />
        {deadlinesOpen && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deadlines.length === 0 ? (
              <li style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No specific dates mentioned.</li>
            ) : (
              deadlines.map((d) => (
                <li
                  key={d.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{d.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{d.date}</span>
                    <button
                      type="button"
                      onClick={() =>
                        logDecision(
                          { id: d.id, text: `${d.label} — ${d.date}` },
                          'Deadline Commitment',
                        )
                      }
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-2)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Add to project milestones
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {/* Transcript */}
      <section style={{ marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setTranscriptOpen((v) => !v)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          View Full Transcript
          <span aria-hidden style={{ color: 'var(--color-text-3)' }}>
            {transcriptOpen ? '▾' : '▸'}
          </span>
        </button>
        {transcriptOpen ? (
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Search transcript…"
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
            <pre
              style={{
                margin: 0,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                color: 'var(--color-text-2)',
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
              {filteredTranscript}
            </pre>
          </div>
        ) : null}
      </section>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--color-text-3)' }}>
        <Link to="/chat" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Return to project chat
        </Link>
      </p>
    </div>
  );
}
