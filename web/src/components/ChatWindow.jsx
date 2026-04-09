import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { isDemoMode } from '../api/demoAdapter';
import ContractPanel from './ContractPanel';
import ChatMessageBubble from './chat/ChatMessageBubble';
import ScopeFlagCard from './chat/ScopeFlagCard';
import CatchUpBanner from './chat/CatchUpBanner';
import DecisionLogPanel from './chat/DecisionLogPanel';
import StakeholderInviteModal from './chat/StakeholderInviteModal';
import MeetingInviteModal from './chat/MeetingInviteModal';
import MeetingBotBanner from './chat/MeetingBotBanner';
import { resolveMessageRole } from './chat/messageRole';
import {
  getMeetingSession,
  setMeetingSession,
  setMeetingSummary,
  clearMeetingSession,
} from '../utils/meetingStorage';
import { getExtraDecisions } from '../utils/decisionsStorage';
import { buildDemoMeetingSummary } from '../data/demoMeetingSummary';
import { setLocalProjectStatus } from '../utils/projectStatusLocal';
import {
  isPortfolioPromptDone,
  isTestimonialPromptDone,
  markPortfolioPromptDone,
  markTestimonialPromptDone,
  isClientRatingPromptDone,
  markClientRatingPromptDone,
} from '../utils/completionPrompts';
import { clientKeyFromProject, recordClientProjectCompleted } from '../utils/clientReputationStorage';
import AddToPortfolioModal from './portfolio/AddToPortfolioModal';
import ClientTestimonialModal from './portfolio/ClientTestimonialModal';
import RateClientModal from './RateClientModal';

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'in_progress') return 'In progress';
  if (s === 'awaiting_approval') return 'Awaiting approval';
  if (s === 'overdue') return 'Overdue';
  if (s === 'completed') return 'Completed';
  if (s === 'archived') return 'Archived';
  if (s === 'pending_match') return 'Pending Match';
  return 'Active';
}

function statusBadgeStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return { bg: '#ecfdf3', color: '#15803d' };
  if (s === 'overdue') return { bg: '#fef2f2', color: '#b91c1c' };
  if (s === 'awaiting_approval') return { bg: '#fffbeb', color: '#b45309' };
  if (s === 'pending_match') return { bg: '#eff6ff', color: '#1d6ecd' };
  if (s === 'in_progress') return { bg: '#eff6ff', color: '#1d4ed8' };
  if (s === 'archived') return { bg: '#f3f4f6', color: '#6b7280' };
  return { bg: 'var(--color-surface-2)', color: 'var(--color-text-2)' };
}

function getDateKey(msg) {
  if (!msg.created_at) return '';
  return new Date(msg.created_at).toDateString();
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - msgDate) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function DateSeparator({ label }) {
  if (!label) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px', padding: '0 8px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  );
}

const DEMO_DECISIONS = () => [
  {
    id: 'demo-d1',
    at: new Date(Date.now() - 3 * 86400000).toISOString(),
    who: 'You, Jordan (Client)',
    summary: 'Agreed to handle the extra hero as a scoped add-on with a mini change order.',
    tag: 'Scope Agreement',
    source: 'chat',
  },
  {
    id: 'demo-d2',
    at: new Date(Date.now() - 2 * 86400000).toISOString(),
    who: 'You',
    summary: 'Client approved revised homepage wireframes for Milestone 2.',
    tag: 'Approval',
    source: 'meeting',
  },
];

const DEMO_PARTICIPANTS = (clientName) => [
  { id: 'u1', name: 'You (Freelancer)', role: 'Host', initials: 'YO', avatarColor: 'var(--color-primary)', removable: false },
  { id: 'u2', name: clientName || 'Client', role: 'Client', initials: (clientName || 'CL').slice(0, 2).toUpperCase(), avatarColor: '#64748b', removable: true },
];

export default function ChatWindow({ project, meetingInviteOpen, onMeetingInviteOpenChange, onProjectStatusChanged }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openTimerPanel, closeTimerPanel, timerPanelOpen } = useTimeTracking();
  const viewerRole = user?.role === 'client' ? 'client' : 'freelancer';
  const isHost = viewerRole === 'freelancer';

  const [input, setInput] = useState('');
  const [scopeAlerts, setScopeAlerts] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [sendHint, setSendHint] = useState('');
  const [decisionLogOpen, setDecisionLogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [meetingPhase, setMeetingPhase] = useState(null);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [rateClientModalOpen, setRateClientModalOpen] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (isDemoMode() || !project?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import('../api/client');
        const { data } = await api.get(`/projects/${project.id}/participants`);
        if (!cancelled && Array.isArray(data)) setParticipants(data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [project?.id]);

  const handleRemoveParticipant = async (id) => {
    if (!project?.id) return;
    try {
      const { api } = await import('../api/client');
      await api.delete(`/projects/${project.id}/participants/${id}`);
      setParticipants((prev) => prev.filter((p) => String(p.id) !== String(id)));
    } catch { /* backend unavailable */ }
  };

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const longPressTimer = useRef(null);
  const meetingTimersRef = useRef([]);

  const handleScopeFlag = useCallback((alert) => {
    const id = alert?.id ?? `scope_${Date.now()}`;
    setScopeAlerts((prev) => [{ ...alert, id }, ...prev]);
  }, []);

  const wsProjectId = project?.id != null ? String(project.id) : undefined;
  const { messages, connected, sendMessage } = useWebSocket(wsProjectId, handleScopeFlag);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const fn = () => setIsMobile(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (connected) setSendHint('');
  }, [connected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, scopeAlerts, showCatchUp, meetingPhase]);

  /* Catch-up banner: show after 24h+ away until dismissed (session-only dismiss) */
  useEffect(() => {
    if (!project?.id) return;
    const exitKey = `fos_chat_exit_${project.id}`;
    const dismissKey = `fos_catchup_dismissed_${project.id}`;
    const raw = localStorage.getItem(exitKey);
    if (raw == null) {
      localStorage.setItem(exitKey, String(Date.now()));
      setShowCatchUp(false);
      return;
    }
    const exit = parseInt(raw, 10);
    const away24 = Date.now() - exit > 24 * 3600 * 1000;
    if (away24) sessionStorage.removeItem(dismissKey);
    const dismissed = sessionStorage.getItem(dismissKey) === '1';
    setShowCatchUp(away24 && !dismissed);
  }, [project?.id]);

  useEffect(() => {
    return () => {
      if (project?.id) localStorage.setItem(`fos_chat_exit_${project.id}`, String(Date.now()));
    };
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    if (!isDemoMode()) {
      setDecisions(getExtraDecisions(project.id));
      setScopeAlerts([]);
      return;
    }
    const base = DEMO_DECISIONS();
    const extra = getExtraDecisions(project.id);
    const ids = new Set(base.map((x) => x.id));
    setDecisions([...base, ...extra.filter((e) => !ids.has(e.id))]);
    setScopeAlerts([
      {
        id: 'demo-scope-1',
        after_message_id: 'demo-m1',
        severity: 'HIGH',
        explanation:
          'This request may be outside your agreed scope — the contract covers 2 revision rounds, and the client is asking for a third.',
        contract_clause:
          '§4.2 Revisions: Client receives up to two (2) rounds of revision per milestone; additional rounds require a written change order.',
        suggested_chips: [
          "Happy to take a look — let me check what's in scope first",
          'That falls outside our current agreement — I can send a change order',
          "I'd love to add that — let me put together a quick change order for you",
        ],
      },
    ]);
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    const s = getMeetingSession(project.id);
    setMeetingPhase(s?.phase ?? null);
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    const s = String(project.status || '').toLowerCase();
    if (s !== 'completed') return;
    if (isHost && !isPortfolioPromptDone(project.id)) {
      setPortfolioModalOpen(true);
    }
    if (!isHost && viewerRole === 'client' && !isTestimonialPromptDone(project.id)) {
      setTestimonialModalOpen(true);
    }
  }, [project?.id, project?.status, isHost, viewerRole]);

  useEffect(() => {
    if (!project?.id) return;
    const s = String(project.status || '').toLowerCase();
    if (s !== 'completed') return;
    if (!isHost) return;
    if (!isPortfolioPromptDone(project.id)) return;
    if (!isClientRatingPromptDone(project.id)) {
      setRateClientModalOpen(true);
    }
  }, [project?.id, project?.status, isHost]);

  useEffect(() => {
    return () => {
      meetingTimersRef.current.forEach((id) => clearTimeout(id));
      meetingTimersRef.current = [];
    };
  }, []);

  const clearMeetingTimers = () => {
    meetingTimersRef.current.forEach((id) => clearTimeout(id));
    meetingTimersRef.current = [];
  };

  const persistMeeting = (phase, extra) => {
    if (!project?.id) return;
    const prev = getMeetingSession(project.id) ?? {};
    setMeetingSession(project.id, { ...prev, phase, ...extra });
    setMeetingPhase(phase);
  };

  const handleMeetingInvite = ({ link, platform }) => {
    if (!project?.id) return;
    clearMeetingTimers();
    const startedAt = Date.now();
    persistMeeting('joining', { link, platform, startedAt });
    const t = window.setTimeout(() => {
      persistMeeting('active', { link, platform, startedAt });
    }, 2500);
    meetingTimersRef.current.push(t);
  };

  const endMeeting = async () => {
    if (!project?.id) return;
    clearMeetingTimers();
    const s = getMeetingSession(project.id);
    if (isDemoMode()) {
      const summary = buildDemoMeetingSummary({
        projectName: project.name,
        callStartedAt: s?.startedAt,
        durationMinutes: 42,
      });
      setMeetingSummary(project.id, summary);
    } else {
      try {
        const { api } = await import('../api/client');
        const { data } = await api.post(`/projects/${project.id}/meeting/end`, {
          startedAt: s?.startedAt,
        });
        if (data) setMeetingSummary(project.id, data);
      } catch {
        /* backend unavailable — skip summary */
      }
    }
    persistMeeting('ended', { endedAt: Date.now() });
  };

  const goToMeetingSummary = () => {
    if (!project?.id) return;
    clearMeetingSession(project.id);
    setMeetingPhase(null);
    navigate(`/projects/${project.id}/meeting-summary`);
  };

  useEffect(() => {
    const close = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderMenuOpen(false);
      if (contextMenu && !e.target.closest?.('[data-chat-context-menu]')) setContextMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const dismissCatchUp = () => {
    if (project?.id) sessionStorage.setItem(`fos_catchup_dismissed_${project.id}`, '1');
    setShowCatchUp(false);
  };

  const dismissScope = (id) => {
    setScopeAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const chipToInput = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
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

  const openMessageContext = (e, msg) => {
    const x = e.clientX ?? e.pageX;
    const y = e.clientY ?? e.pageY;
    setContextMenu({ x, y, msg });
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (msg) => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setContextMenu({ x: window.innerWidth / 2, y: 120, msg });
    }, 500);
  };

  const logMessageAsDecision = (msg) => {
    setContextMenu(null);
    setDecisionLogOpen(true);
    setDecisions((prev) => [
      ...prev,
      {
        id: `dec-${Date.now()}`,
        at: new Date().toISOString(),
        who: msg.sender_name || 'Participant',
        summary: typeof msg.text === 'string' ? msg.text.slice(0, 200) : 'Logged from chat',
        tag: 'Other',
        source: 'chat',
      },
    ]);
  };

  const addDecision = (entry) => {
    setDecisions((prev) => [...prev, entry]);
  };

  if (!project) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
        Select a project to start chatting
      </div>
    );
  }

  const sb = statusBadgeStyle(project.status);
  const headerStatus = isDemoMode() ? 'Demo (local)' : connected ? 'Connected' : 'Offline — start API or enable demo mode';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, minWidth: 0, width: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 14px 10px 8px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-surface)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Back arrow */}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text)',
            flexShrink: 0,
          }}
          aria-label="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Centered project info */}
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.client_name || project.freelancer_name || ''}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '3px 8px',
                borderRadius: 6,
                background: sb.bg,
                color: sb.color,
              }}
            >
              {statusLabel(project.status)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: connected ? '#16a34a' : '#9aa0ae',
                  display: 'inline-block',
                }}
              />
              {headerStatus}
            </span>
          </div>
        </div>

        {/* Right side: video camera + three-dot menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onMeetingInviteOpenChange?.(true)}
            title="Start meeting"
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="13" height="12" rx="2" />
              <path d="M15 10l5-3v10l-5-3" />
            </svg>
          </button>

          <div ref={headerMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              aria-expanded={headerMenuOpen}
              aria-haspopup="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {headerMenuOpen ? (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 6,
                  minWidth: 220,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  boxShadow: '0 12px 32px rgba(15, 22, 35, 0.12)',
                  zIndex: 50,
                  padding: 6,
                }}
              >
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setShowContract(true);
                  }}
                >
                  View Contract
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    if (project?.id != null) navigate(`/projects/${project.id}/scope-drift`);
                  }}
                >
                  Pull Scope Drift Report
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setDecisionLogOpen(true);
                  }}
                >
                  View Decision Log
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setInviteOpen(true);
                  }}
                >
                  Invite Stakeholder
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    if (project?.id != null) navigate(`/projects/${project.id}/contract`);
                  }}
                >
                  Project Settings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setLocalProjectStatus(project.id, 'archived');
                    onProjectStatusChanged?.();
                  }}
                >
                  Archive Project
                </MenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {meetingPhase ? (
        <MeetingBotBanner phase={meetingPhase} onPressEnded={goToMeetingSummary} onEndSession={endMeeting} />
      ) : null}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 12px 16px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface-2)',
          minHeight: 0,
        }}
      >
        {showCatchUp ? (
          <CatchUpBanner
            bullets={[
              'Jordan asked for an additional hero variant before launch.',
              'FreelanceOS AI reminded you about the Milestone 2 deadline.',
              'You agreed to follow up with a mini change order.',
            ]}
            onDismiss={dismissCatchUp}
          />
        ) : null}

        {messages.map((msg, i) => {
          const role = resolveMessageRole(msg, user);
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const prevRole = prevMsg ? resolveMessageRole(prevMsg, user) : null;
          const showDateSep = i === 0 || getDateKey(msg) !== getDateKey(prevMsg);
          const isGroupStart = role !== prevRole || showDateSep;
          const receipt = role === 'freelancer' ? (msg.status || 'read') : undefined;
          const alertsHere = scopeAlerts.filter((a) => a.after_message_id === msg.id);
          const marginTop = i === 0 ? 0 : (isGroupStart || showDateSep) ? 12 : 3;

          return (
            <div key={msg.id || i} style={{ width: '100%', marginTop }}>
              {showDateSep && msg.created_at && (
                <DateSeparator label={formatDateSeparator(msg.created_at)} />
              )}
              <div
                style={{ width: '100%' }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMessageContext(e, msg);
                }}
                onTouchStart={() => startLongPress(msg)}
                onTouchEnd={clearLongPress}
                onTouchCancel={clearLongPress}
                onTouchMove={clearLongPress}
              >
                <ChatMessageBubble msg={msg} role={role} viewerRole={viewerRole} isGroupStart={isGroupStart} receipt={receipt} />
              </div>
              {viewerRole === 'freelancer'
                ? alertsHere.map((alert) => (
                    <ScopeFlagCard key={alert.id} alert={alert} onDismiss={dismissScope} onChipTap={chipToInput} />
                  ))
                : null}
            </div>
          );
        })}

        {viewerRole === 'freelancer'
          ? scopeAlerts
              .filter((a) => !a.after_message_id)
              .map((alert) => <ScopeFlagCard key={alert.id} alert={alert} onDismiss={dismissScope} onChipTap={chipToInput} />)
          : null}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '8px 10px',
          }}
        >
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} multiple />
          <button
            type="button"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-2)',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={4}
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
              minHeight: 22,
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
              width: 36,
              height: 36,
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
          Enter to send · Shift+Enter for new line · Long-press or right-click a message to log as decision
          {!isDemoMode() ? ' · AI Scope Guardian is monitoring this conversation' : ' · Demo mode (messages stay in your browser only)'}
        </p>
      </div>

      {showContract && <ContractPanel projectId={project.id} onClose={() => setShowContract(false)} />}

      <DecisionLogPanel
        open={decisionLogOpen}
        onClose={() => setDecisionLogOpen(false)}
        projectName={project.name}
        entries={decisions}
        onAddEntry={addDecision}
        isMobile={isMobile}
      />

      <StakeholderInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectName={project.name}
        participants={isDemoMode() ? DEMO_PARTICIPANTS(project.client_name) : participants}
        isHost={isHost}
        onRemove={isDemoMode() ? () => {} : handleRemoveParticipant}
      />

      <MeetingInviteModal
        open={!!meetingInviteOpen}
        onClose={() => onMeetingInviteOpenChange?.(false)}
        onInvite={handleMeetingInvite}
        projectName={project.name}
      />

      <AddToPortfolioModal
        open={portfolioModalOpen}
        project={project}
        messages={messages}
        clientName={project.client_name}
        onClose={() => {
          markPortfolioPromptDone(project.id);
          setPortfolioModalOpen(false);
          if (isHost && !isClientRatingPromptDone(project.id)) {
            setRateClientModalOpen(true);
          }
        }}
        onSkip={() => {
          markPortfolioPromptDone(project.id);
          setPortfolioModalOpen(false);
          if (isHost && !isClientRatingPromptDone(project.id)) {
            setRateClientModalOpen(true);
          }
        }}
      />

      <RateClientModal
        open={rateClientModalOpen}
        clientName={project.client_name}
        clientKey={clientKeyFromProject(project)}
        projectId={project.id}
        onSubmitted={() => markClientRatingPromptDone(project.id)}
        onSkip={() => markClientRatingPromptDone(project.id)}
        onClose={() => setRateClientModalOpen(false)}
      />

      <ClientTestimonialModal
        open={testimonialModalOpen}
        freelancerName={project.freelancer_name || 'Freelancer'}
        freelancerId={project.freelancer_id != null ? String(project.freelancer_id) : '1'}
        projectId={project.id}
        clientName={project.client_name}
        onClose={() => {
          markTestimonialPromptDone(project.id);
          setTestimonialModalOpen(false);
        }}
        onSkip={() => {
          markTestimonialPromptDone(project.id);
          setTestimonialModalOpen(false);
        }}
        onSubmitted={() => markTestimonialPromptDone(project.id)}
      />

      {contextMenu ? (
        <div
          data-chat-context-menu
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 52),
            zIndex: 300,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15, 22, 35, 0.12)',
            minWidth: 160,
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => logMessageAsDecision(contextMenu.msg)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              borderRadius: 6,
            }}
          >
            Log as Decision
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (timerPanelOpen) closeTimerPanel();
          else if (project?.id) openTimerPanel(project.id);
        }}
        aria-label={timerPanelOpen ? 'Close timer' : 'Open timer'}
        title="Time tracker"
        style={{
          position: 'fixed',
          right: 20,
          bottom: isMobile ? 88 : 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: timerPanelOpen ? 'var(--color-surface-3)' : 'var(--color-primary)',
          color: timerPanelOpen ? 'var(--color-text)' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(29, 110, 205, 0.35)',
          cursor: project ? 'pointer' : 'not-allowed',
          zIndex: 85,
          fontFamily: 'var(--font-sans)',
        }}
        disabled={!project}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 7V4M12 7l3-2M12 7l-3-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        border: 'none',
        borderRadius: 6,
        background: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
      }}
    >
      {children}
    </button>
  );
}
