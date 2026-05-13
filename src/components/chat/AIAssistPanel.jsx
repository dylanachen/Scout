import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { isDemoMode } from '../../api/demoAdapter';

const STARTERS = [
  'What have we agreed on so far?',
  'What are the open questions?',
  'Give me 3 ideas to improve this project.',
  'Draft a polite reply asking for a deadline extension.',
  'Explain the difference between fixed-price and hourly contracts.',
];

function MessageBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 13px',
        borderRadius: 12,
        fontSize: 13,
        lineHeight: 1.55,
        background: isUser ? 'var(--color-primary)' : 'var(--color-surface-2)',
        color: isUser ? '#fff' : 'var(--color-text)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

export default function AIAssistPanel({ open, onClose, projectId, projectName }) {
  const [thread, setThread] = useState([]);  // [{role: 'user'|'assistant', text}]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const ask = async (question) => {
    const q = String(question ?? '').trim();
    if (!q || sending) return;
    setErr('');
    setThread((t) => [...t, { role: 'user', text: q }]);
    setInput('');
    setSending(true);
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 500));
        setThread((t) => [...t, {
          role: 'assistant',
          text: 'Demo mode — connect the backend to enable AI answers about this chat.',
        }]);
      } else {
        const { data } = await api.post(`/projects/${projectId}/chat/ask`, { question: q });
        setThread((t) => [...t, { role: 'assistant', text: data?.answer || '(no answer)' }]);
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to get an answer.');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ask(input);
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(15,22,35,0.45)', border: 'none', cursor: 'pointer' }}
      />
      <div
        role="dialog" aria-modal="true" aria-labelledby="ai-assist-title"
        style={{
          position: 'fixed',
          right: 0, top: 0, bottom: 0, zIndex: 211,
          width: 'min(440px, 100vw)',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-8px 0 24px rgba(15, 22, 35, 0.12)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: '#0891b2',
              background: '#ecfeff', padding: '3px 8px', borderRadius: 999,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a7 7 0 017 7c0 3-2 5-4 6l-1 4h-4l-1-4c-2-1-4-3-4-6a7 7 0 017-7z"/>
              </svg>
              AI Assist
            </div>
            <h2 id="ai-assist-title" style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700 }}>
              Ask AI anything
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
              Chat questions, ideas, brainstorming — {projectName || 'this project'}'s context is loaded if you need it.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-3)', padding: 4 }}>
            ×
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {thread.length === 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-3)' }}>
                Try one of these:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} disabled={sending}
                    style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: 10,
                      border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
                      color: 'var(--color-text)', fontSize: 13, cursor: sending ? 'default' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {thread.map((m, i) => <MessageBubble key={i} role={m.role} text={m.text} />)}

          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-3)', fontSize: 12 }}>
              <div className="scout-spinner scout-spinner--on-light" style={{ width: 14, height: 14 }} aria-hidden />
              Thinking…
            </div>
          )}

          {err && (
            <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
              {err}
            </div>
          )}
        </div>

        {thread.length > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: '10px 12px 4px',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.02em' }}>
              Suggestions
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 6,
                scrollbarWidth: 'thin',
              }}
            >
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={sending}
                  title={s}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-2)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: sending ? 'default' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    maxWidth: 260,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          padding: 12, borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="Ask anything — this chat, new ideas, or general questions…"
            rows={2}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
              color: 'var(--color-text)', outline: 'none', fontSize: 14,
              resize: 'none', fontFamily: 'inherit',
            }}
          />
          <button type="submit" disabled={!input.trim() || sending}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: (!input.trim() || sending) ? 'var(--color-surface-3)' : 'var(--color-primary)',
              color: (!input.trim() || sending) ? 'var(--color-text-3)' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: (!input.trim() || sending) ? 'not-allowed' : 'pointer',
            }}>
            Ask
          </button>
        </form>
      </div>
    </>
  );
}
