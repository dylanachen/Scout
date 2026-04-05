import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { isDemoMode } from '../api/demoAdapter';
import ScopeAlert from './ScopeAlert';
import ContractPanel from './ContractPanel';

export default function ChatWindow({ project }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [scopeAlerts, setScopeAlerts] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [sendHint, setSendHint] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const handleScopeFlag = useCallback((alert) => {
    const id = alert?.id ?? `scope_${Date.now()}`;
    setScopeAlerts((prev) => [{ ...alert, id }, ...prev]);
  }, []);

  const wsProjectId = project?.id != null ? String(project.id) : undefined;
  const { messages, connected, sendMessage } = useWebSocket(wsProjectId, handleScopeFlag);

  useEffect(() => {
    if (connected) setSendHint('');
  }, [connected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, scopeAlerts]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    /* Demo chat is local-only — never block on WebSocket `connected` (avoids race on first paint). */
    if (isDemoMode()) {
      setSendHint('');
      sendMessage(text);
      setInput('');
      inputRef.current?.focus();
      return;
    }
    if (!connected) {
      setSendHint(
        'Not connected to the chat server. Start the FastAPI backend, or set VITE_DEMO_MODE=true in web/.env and restart npm run dev.',
      );
      return;
    }
    setSendHint('');
    sendMessage(text);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const dismissAlert = (id) => {
    setScopeAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (!project) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
        Select a project to start chatting
      </div>
    );
  }

  const clientInitials = (project.client_name?.slice(0, 2) ?? '—').toUpperCase();

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {clientInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: connected ? '#16a34a' : '#9aa0ae',
                  display: 'inline-block',
                }}
              />
              {project.client_name ?? 'Client'} ·{' '}
              {isDemoMode() ? 'Demo (local)' : connected ? 'Connected' : 'Offline — start API or enable demo mode'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn type="button" onClick={() => setShowContract((v) => !v)}>
              Contract
            </Btn>
            <Btn type="button">Files</Btn>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--color-surface-2)',
          }}
        >
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            const alertsHere = scopeAlerts.filter((a) => a.after_message_id === msg.id);

            return (
              <div key={msg.id || i}>
                <MessageBubble msg={msg} isMine={isMine} />
                {alertsHere.map((alert) => (
                  <ScopeAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />
                ))}
              </div>
            );
          })}

          {scopeAlerts
            .filter((a) => !a.after_message_id)
            .map((alert) => (
              <ScopeAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}

          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${project.client_name ?? 'client'}…`}
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                background: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--color-text)',
                resize: 'none',
                outline: 'none',
                maxHeight: 100,
                lineHeight: 1.5,
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: input.trim() ? 'var(--color-primary)' : 'var(--color-surface-3)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background var(--transition)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12 7L2 2l3 5-3 5 10-5z" fill={input.trim() ? '#fff' : 'var(--color-text-3)'} />
              </svg>
            </button>
          </div>
          {sendHint ? (
            <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, lineHeight: 1.45 }}>{sendHint}</p>
          ) : null}
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>
            Enter to send · Shift+Enter for new line
            {!isDemoMode() ? ' · AI Scope Guardian is monitoring this conversation' : ' · Demo mode (messages stay in your browser only)'}
          </p>
        </div>
      </div>

      {showContract && <ContractPanel projectId={project.id} onClose={() => setShowContract(false)} />}
    </div>
  );
}

function MessageBubble({ msg, isMine }) {
  const initials = msg.sender_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '•';
  const avatarColor = isMine ? 'var(--color-primary)' : '#8b5cf6';

  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: isMine ? 'row-reverse' : 'row', maxWidth: '100%' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ maxWidth: '72%' }}>
        {!isMine && (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>
            {msg.sender_name} · {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        )}
        <div
          style={{
            padding: '10px 13px',
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.55,
            background: isMine ? 'var(--color-primary)' : 'var(--color-surface)',
            color: isMine ? '#fff' : 'var(--color-text)',
            border: isMine ? 'none' : '1px solid var(--color-border)',
            borderTopLeftRadius: isMine ? 12 : 4,
            borderTopRightRadius: isMine ? 4 : 12,
          }}
        >
          {msg.text}
        </div>
        {isMine && (
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4, textAlign: 'right' }}>
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} · Sent
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ children, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: '5px 11px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </button>
  );
}
