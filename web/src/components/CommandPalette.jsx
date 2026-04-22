import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_MATCHES } from '../data/mockMatches';

const STATIC_COMMANDS = [
  { id: 'go-dashboard', label: 'Go to Dashboard', hint: 'Navigation', path: '/' },
  { id: 'go-projects', label: 'Go to Projects', hint: 'Navigation', path: '/projects' },
  { id: 'go-pipeline', label: 'Go to Pipeline', hint: 'Navigation', path: '/pipeline' },
  { id: 'go-matches', label: 'Go to Matches', hint: 'Navigation', path: '/matches' },
  { id: 'go-notifications', label: 'Go to Notifications', hint: 'Navigation', path: '/notifications' },
  { id: 'go-chat', label: 'Go to Chat', hint: 'Navigation', path: '/chat' },
  { id: 'go-invoices', label: 'Go to Invoices', hint: 'Navigation', path: '/invoices' },
  { id: 'go-inbox', label: 'Open Unified Inbox', hint: 'Navigation', path: '/inbox' },
  { id: 'go-earnings', label: 'View Earnings', hint: 'Navigation', path: '/earnings' },
  { id: 'go-proposals', label: 'View Proposals', hint: 'Navigation', path: '/proposals' },
  { id: 'go-calendar', label: 'Open Calendar', hint: 'Navigation', path: '/calendar' },
  { id: 'go-referrals', label: 'Referrals', hint: 'Navigation', path: '/referrals' },
  { id: 'go-disputes', label: 'Disputes', hint: 'Navigation', path: '/disputes' },
  { id: 'go-payment-methods', label: 'Payment Methods', hint: 'Navigation', path: '/payment-methods' },
  { id: 'go-search', label: 'Global Search', hint: 'Navigation', path: '/search' },
  { id: 'go-time-week', label: 'Weekly Time Summary', hint: 'Navigation', path: '/time/week' },
  { id: 'go-settings', label: 'Settings', hint: 'Navigation', path: '/settings' },
  { id: 'go-settings-profile', label: 'Profile Settings', hint: 'Settings', path: '/settings/profile' },
  { id: 'go-settings-account', label: 'Account Settings', hint: 'Settings', path: '/settings/account' },
  { id: 'go-settings-notifications', label: 'Notification Preferences', hint: 'Settings', path: '/settings/notifications' },
  { id: 'go-settings-rates', label: 'Rates & Pricing', hint: 'Settings', path: '/settings/rates-pricing' },
  { id: 'go-settings-scope', label: 'Scope Guardian', hint: 'Settings', path: '/settings/scope-guardian' },
  { id: 'go-settings-comm', label: 'Communication Preferences', hint: 'Settings', path: '/settings/communication' },
  { id: 'go-settings-2fa', label: 'Two-Factor Authentication', hint: 'Security', path: '/settings/two-factor' },
  { id: 'go-settings-sessions', label: 'Active Sessions', hint: 'Security', path: '/settings/sessions' },
  { id: 'go-help', label: 'Help & FAQ', hint: 'Support', path: '/help' },
  { id: 'go-whats-new', label: "What's new", hint: 'Support', path: '/whats-new' },
];

function fuzzyScore(query, label) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.includes(q)) return 100 - Math.abs(l.indexOf(q));
  let qi = 0;
  let score = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) {
      score += 1;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands = useMemo(() => {
    const matches = (MOCK_MATCHES || []).slice(0, 8).map((m) => ({
      id: `match-${m.id}`,
      label: `Open match: ${m.name}`,
      hint: 'Matches',
      path: '/matches',
    }));
    return [...STATIC_COMMANDS, ...matches];
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 30);
    return commands
      .map((c) => ({ ...c, score: fuzzyScore(query, c.label) }))
      .filter((c) => c.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [commands, query]);

  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(0);
  }, [results.length, activeIndex]);

  if (!open) return null;

  const commit = (cmd) => {
    onClose();
    if (cmd?.path) navigate(cmd.path);
  };

  return (
    <div
      className="scout-cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="scout-cmdk-panel">
        <input
          ref={inputRef}
          className="scout-cmdk-input"
          placeholder="Type a command or search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              commit(results[activeIndex]);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <div className="scout-cmdk-list" role="listbox">
          {results.length === 0 ? (
            <div className="scout-cmdk-empty">No results.</div>
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={r.id}
                className="scout-cmdk-item"
                data-active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(r)}
                role="option"
                aria-selected={i === activeIndex}
              >
                <span style={{ flex: 1 }}>{r.label}</span>
                {r.hint ? (
                  <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{r.hint}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '8px 12px',
            fontSize: 11,
            color: 'var(--color-text-3)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
}
