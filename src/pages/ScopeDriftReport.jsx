import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { useProjectFromParams } from '../hooks/useProjectFromParams';
import { formatShortDate } from '../utils/dashboard';

/** @typedef {'low' | 'medium' | 'high'} Severity */
/** @typedef {'dismissed' | 'change_order_sent' | 'in_progress'} Outcome */

const SEVERITY_STYLES = {
  low: { label: 'Low', bg: 'var(--color-severity-low-bg)', color: 'var(--color-severity-low)', border: '#bbf7d0' },
  medium: { label: 'Medium', bg: 'var(--color-severity-med-bg)', color: 'var(--color-severity-med)', border: '#fde047' },
  high: { label: 'High', bg: 'var(--color-severity-high-bg)', color: 'var(--color-severity-high)', border: '#fecaca' },
};

const OUTCOME_LABELS = {
  dismissed: 'Dismissed',
  change_order_sent: 'Change order sent',
  in_progress: 'In progress',
};

const SAMPLE_FLAGS = [
  {
    id: '1',
    date: '2026-04-02',
    description: 'Client requested analytics widgets beyond the agreed MVP scope.',
    severity: 'medium',
    outcome: 'change_order_sent',
  },
  {
    id: '2',
    date: '2026-03-28',
    description: 'Extra design review rounds not covered in the original SOW.',
    severity: 'low',
    outcome: 'dismissed',
  },
  {
    id: '3',
    date: '2026-03-15',
    description: 'Integration with a third-party CRM was discussed as optional; work started without a signed addendum.',
    severity: 'high',
    outcome: 'in_progress',
  },
];

const DATE_RANGES = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'full', label: 'Full Project' },
];

function parseRate() {
  try {
    const raw = localStorage.getItem('scout_default_hourly_rate');
    const n = parseFloat(String(raw ?? ''));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return 125;
}

function getWeekStart(today) {
  const d = new Date(today);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(today) {
  const d = new Date(today);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ScopeDriftReport() {
  const { projectId, projectName, loading } = useProjectFromParams();
  const [searchParams] = useSearchParams();
  const sample = searchParams.get('sample') === '1';

  const [flags] = useState(() => (sample ? SAMPLE_FLAGS : []));
  const [dateRange, setDateRange] = useState('month');

  const today = new Date();
  const hourlyRate = useMemo(() => parseRate(), []);

  const rangeStart = useMemo(() => {
    if (dateRange === 'week') return getWeekStart(today);
    if (dateRange === 'month') return getMonthStart(today);
    return null;
  }, [dateRange]);

  const rangeLabel = useMemo(() => {
    if (dateRange === 'full') return 'Full Project';
    const end = today;
    return `${formatShortDate(rangeStart)} – ${formatShortDate(end)}`;
  }, [dateRange, rangeStart]);

  const filteredFlags = useMemo(() => {
    if (dateRange === 'full' || !rangeStart) return flags;
    return flags.filter((f) => new Date(`${f.date}T12:00:00`) >= rangeStart);
  }, [flags, dateRange, rangeStart]);

  const dismissed = filteredFlags.filter((f) => f.outcome === 'dismissed').length;
  const actioned = filteredFlags.filter((f) => f.outcome === 'change_order_sent').length;
  const inProgress = filteredFlags.filter((f) => f.outcome === 'in_progress').length;

  const estimatedUnbilledHours = useMemo(() => {
    if (!filteredFlags.length) return 0;
    return filteredFlags.reduce((acc, f) => {
      if (f.outcome === 'dismissed') return acc;
      const h = f.severity === 'high' ? 8 : f.severity === 'medium' ? 4 : 2;
      return acc + h;
    }, 0);
  }, [filteredFlags]);

  const driftDollars = Math.round(estimatedUnbilledHours * hourlyRate * 100) / 100;

  const exportPdf = () => {
    window.print();
  };

  const sortedFlags = useMemo(() => [...filteredFlags].sort((a, b) => (a.date < b.date ? 1 : -1)), [filteredFlags]);

  return (
    <div className="main-scroll scout-scope-drift-print-root" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
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
            <Link
              className="scout-no-print"
              to="/projects"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              ← Projects
            </Link>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 6px', letterSpacing: '-0.03em' }}>Scope Drift Report</h1>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>{loading ? 'Loading…' : projectName}</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{rangeLabel}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="scout-no-print"
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text)',
              }}
            >
              {DATE_RANGES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="scout-no-print"
              onClick={exportPdf}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              Export as PDF
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <MetricCard label="Total scope flags raised" value={String(filteredFlags.length)} />
          <MetricCard label="Flags actioned" value={String(actioned)} hint={inProgress > 0 ? `${inProgress} in progress` : undefined} />
          <MetricCard label="Estimated unbilled hours" value={String(estimatedUnbilledHours)} />
          <MetricCard label="Est. dollar drift" value={new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(driftDollars)} hint={`@${hourlyRate}/hr default rate`} />
        </div>

        {!filteredFlags.length ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              borderRadius: 14,
              border: '1px dashed var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="#16a34a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#dcfce7"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
              No scope drift detected on this project 🎉
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
              Keep it up — your project is on track.
            </div>
          </div>
        ) : (
          <section aria-label="Flag timeline">
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Timeline</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedFlags.map((f) => {
                const sev = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.medium;
                return (
                  <li
                    key={f.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      background: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <time style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>{f.date}</time>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: sev.bg,
                          color: sev.color,
                          border: `1px solid ${sev.border}`,
                        }}
                      >
                        {sev.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginLeft: 'auto' }}>
                        {OUTCOME_LABELS[f.outcome] ?? f.outcome}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--color-text)' }}>{f.description}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {projectId && (
          <div className="scout-no-print" style={{ marginTop: 28, fontSize: 12, color: 'var(--color-text-3)' }}>
            <Link to={`/projects/${projectId}/contract`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Contract upload
            </Link>
            {' · '}
            <Link to={`/projects/${projectId}/change-order`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Change order preview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
