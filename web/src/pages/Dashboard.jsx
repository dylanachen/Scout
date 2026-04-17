import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import ProjectCard from '../components/ProjectCard';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrencyFromCents, formatShortDate, greetingPrefix, firstName } from '../utils/dashboard';
import { useNotifications } from '../hooks/useNotifications';
import { formatRelativeTime } from '../utils/notificationModel';
import { NotificationTypeIcon } from '../components/NotificationIcons';

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, err, stats, projects, pendingMatches } = useDashboardData();
  const { items: notificationItems } = useNotifications();
  const [dismissed, setDismissed] = useState(() => new Set());
  const [matchesOpen, setMatchesOpen] = useState(false);

  const visibleMatches = useMemo(
    () => (pendingMatches ?? []).filter((m) => !dismissed.has(m.id)),
    [pendingMatches, dismissed],
  );

  const greeting = `${greetingPrefix()}, ${firstName(user)} 👋`;
  const today = useMemo(() => formatShortDate(new Date()), []);

  const pendingTotal = formatCurrencyFromCents(stats.pending_invoices_total_cents);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>{greeting}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{today}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/pipeline"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              background: 'var(--color-surface)',
            }}
          >
            Pipeline view
          </Link>
          <Link
            to="/onboarding"
            className="scout-start-project-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
            }}
          >
            Start a New Project
          </Link>
        </div>
      </div>

      {err && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          {err}
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-3)' }}>Loading dashboard…</div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <MetricCard label="Active projects" value={String(stats.active_projects ?? 0)} unit="projects" href="/projects" />
        <MetricCard label="Hours this week" value={stats.hours_logged_week != null ? String(stats.hours_logged_week) : '—'} unit="hrs" href="/time/week" />
        <MetricCard
          label="Pending invoices"
          value={String(stats.pending_invoices_count ?? 0)}
          hint={stats.pending_invoices_total_cents != null ? `${pendingTotal} total` : undefined}
          hintColor="#16a34a"
          href="/invoices"
        />
        <MetricCard
          label="Unread messages"
          value={String(stats.unread_messages ?? 0)}
          badge={stats.unread_messages ?? 0}
          href="/notifications"
        />
      </div>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Active projects</h2>
          <Link to="/projects" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
            View all
          </Link>
        </div>
        <div className="dashboard-projects-scroll">
          <div className="dashboard-projects-grid">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
            {!projects.length && !loading && (
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 14,
                  padding: '40px 20px',
                  textAlign: 'center',
                  gridColumn: '1 / -1',
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--color-text-3)', margin: '0 0 16px' }}>No active projects</p>
                <Link
                  to="/onboarding"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {visibleMatches.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => setMatchesOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: 0,
              margin: '0 0 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Pending matches</h2>
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: '#dbeafe',
                color: '#1d4ed8',
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {visibleMatches.length}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              style={{
                marginLeft: 'auto',
                transition: 'transform 0.2s ease',
                transform: matchesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path d="M4 6l4 4 4-4" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {matchesOpen && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleMatches.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                      {m.counterpart_name} · {m.budget}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
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
                      onClick={() => setDismissed((s) => new Set(s).add(m.id))}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-2)',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                      onClick={() => setDismissed((s) => new Set(s).add(m.id))}
                    >
                      Pass
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section style={{ marginBottom: 88 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Recent Activity</h2>
          <Link to="/notifications" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
            View all notifications
          </Link>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notificationItems.slice(0, 5).map((n) => (
            <li
              key={n.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 13,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: 'var(--color-text-3)', marginTop: 1, flexShrink: 0 }}>
                <NotificationTypeIcon type={n.type} size={18} />
              </span>
              <span style={{ flex: 1, color: 'var(--color-text-2)', minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 2 }}>{n.title}</span>
                {n.description}
              </span>
              <time style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{formatRelativeTime(n.at)}</time>
            </li>
          ))}
          {!notificationItems.length && !loading && (
            <li style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '8px 0' }}>No notifications.</li>
          )}
        </ul>
      </section>

      <Link
        to="/onboarding"
        className="scout-fab"
        aria-label="Start a New Project"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 88,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: '#fff',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(29, 110, 205, 0.4)',
          textDecoration: 'none',
          zIndex: 50,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Link>
    </div>
  );
}
