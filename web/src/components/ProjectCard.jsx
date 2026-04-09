import { Link } from 'react-router-dom';
import { STATUS_STYLES, daysUntil, formatDeadlineDate } from '../utils/dashboard';

export default function ProjectCard({ project }) {
  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES.in_progress;
  const counterpart =
    project.viewer_role === 'client'
      ? { label: 'Freelancer', name: project.freelancer_name ?? 'Freelancer' }
      : { label: 'Client', name: project.client_name ?? 'Client' };
  const d = daysUntil(project.next_deadline);
  const deadlineDateStr = formatDeadlineDate(project.next_deadline);

  let deadlineLabel = 'No deadline';
  let deadlineColor = 'var(--color-text-2)';
  if (d !== null) {
    if (d < 0) {
      deadlineLabel = `${Math.abs(d)}d overdue`;
      deadlineColor = 'var(--color-danger)';
    } else if (d === 0) {
      deadlineLabel = 'Due today';
      deadlineColor = '#ea580c';
    } else if (d < 7) {
      deadlineLabel = `${d}d left`;
      deadlineColor = '#ea580c';
    } else {
      deadlineLabel = `${d}d left`;
    }
  }

  const mi = Math.min(project.milestone_total, Math.max(1, project.milestone_index));
  const pct = Math.round((mi / project.milestone_total) * 100);

  return (
    <article
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        background: 'var(--color-surface)',
        padding: '16px 16px 14px',
        minWidth: 280,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 }}>{project.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--color-surface-3)',
                color: 'var(--color-text-2)',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden
            >
              {String(counterpart.name)
                .split(/\s+/)
                .filter(Boolean)
                .map((x) => x[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
              <span style={{ color: 'var(--color-text-3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {counterpart.label}
              </span>
              <div style={{ fontWeight: 500 }}>{counterpart.name}</div>
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '5px 8px',
            borderRadius: 8,
            background: st.bg,
            color: st.color,
            border: `1px solid ${st.border}`,
            flexShrink: 0,
          }}
        >
          {st.label}
        </span>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>
          <span>
            Milestone {mi} of {project.milestone_total}
          </span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--color-surface-3)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: deadlineColor }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {deadlineDateStr ? `${deadlineDateStr} · ${deadlineLabel}` : deadlineLabel}
        </span>
        {project.unread_count > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                fill="var(--color-primary)"
                stroke="var(--color-primary)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {project.unread_count} new
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <Link
          to="/chat"
          state={{ projectId: project.id }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(29, 110, 205, 0.25)',
            width: '100%',
          }}
        >
          Open Chat
        </Link>
      </div>
    </article>
  );
}
