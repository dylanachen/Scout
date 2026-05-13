import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrencyFromCents } from '../utils/dashboard';

function parseDay(s) {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function derivePipelineFromProjects(projects, stats) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 45);
  const ws = windowStart.toISOString().slice(0, 10);
  const we = windowEnd.toISOString().slice(0, 10);

  const bars = (projects ?? []).map((p) => {
    const end = p.next_deadline ? new Date(p.next_deadline) : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 21);
    return {
      project_id: p.id,
      name: p.name,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });

  const upcoming_deadlines = (projects ?? [])
    .filter((p) => p.next_deadline)
    .map((p) => ({
      project_id: p.id,
      name: p.name,
      date: String(p.next_deadline).slice(0, 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    window_start: ws,
    window_end: we,
    revenue_forecast: {
      from_active_projects_cents: 0,
      from_pending_invoices_cents: stats?.pending_invoices_total_cents ?? 0,
    },
    bars,
    upcoming_deadlines,
  };
}

function barLayout(bar, winStart, winEnd) {
  const a = parseDay(bar.start);
  const b = parseDay(bar.end);
  if (!a || !b) return { left: 0, width: 0 };
  const total = winEnd - winStart;
  if (total <= 0) return { left: 0, width: 0 };
  const clipStart = new Date(Math.max(a.getTime(), winStart.getTime()));
  const clipEnd = new Date(Math.min(b.getTime(), winEnd.getTime()));
  if (clipEnd <= clipStart) return { left: 0, width: 0 };
  const left = ((clipStart - winStart) / total) * 100;
  const width = ((clipEnd - clipStart) / total) * 100;
  return { left, width: Math.max(width, 1.2) };
}

export default function PipelineView() {
  const { loading, err, projects, pipeline: rawPipeline, stats } = useDashboardData();

  const pipeline = useMemo(() => {
    if (rawPipeline && rawPipeline.bars) return rawPipeline;
    return derivePipelineFromProjects(projects, stats);
  }, [rawPipeline, projects, stats]);

  const winStart = useMemo(() => parseDay(pipeline.window_start) ?? new Date(), [pipeline]);
  const winEnd = useMemo(() => parseDay(pipeline.window_end) ?? new Date(), [pipeline]);

  const revenue = pipeline.revenue_forecast ?? {};
  const activeC = revenue.from_active_projects_cents ?? revenue.fromActiveProjectsCents ?? 0;
  const pendingC = revenue.from_pending_invoices_cents ?? revenue.fromPendingInvoicesCents ?? 0;

  const deadlines = pipeline.upcoming_deadlines ?? pipeline.upcomingDeadlines ?? [];

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 6px', letterSpacing: '-0.03em' }}>Pipeline</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Active work on a timeline, plus cash you can expect.</p>
      </div>

      {err && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{err}</div>
      )}
      {loading && <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-3)' }}>Loading…</div>}

      <section
        style={{
          marginBottom: 24,
          padding: 18,
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>
          Revenue forecast
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              From active projects
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{formatCurrencyFromCents(activeC)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending invoices
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{formatCurrencyFromCents(pendingC)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Combined
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{formatCurrencyFromCents(activeC + pendingC)}</div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Timeline</h2>
        <div
          style={{
            borderRadius: 14,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            padding: '14px 16px 18px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', marginBottom: 10 }}>
            <span>{pipeline.window_start ?? ''}</span>
            <span>{pipeline.window_end ?? ''}</span>
          </div>
          <div style={{ position: 'relative', minHeight: (pipeline.bars ?? []).length * 40 + 8 }}>
            {(pipeline.bars ?? []).map((bar, i) => {
              const { left, width } = barLayout(bar, winStart, winEnd);
              return (
                <div key={bar.project_id ?? bar.name ?? i} style={{ height: 36, marginBottom: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 10, width: 160, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bar.name}
                  </div>
                  <div style={{ marginLeft: 168, height: 28, position: 'relative', background: 'var(--color-surface-3)', borderRadius: 6 }}>
                    <div
                      title={`${bar.start} → ${bar.end}`}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${width}%`,
                        top: 4,
                        height: 20,
                        borderRadius: 6,
                        background: 'linear-gradient(90deg, var(--color-primary), #5b9bd5)',
                        minWidth: 4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!(pipeline.bars ?? []).length && !loading && (
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>No timeline rows yet.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Upcoming deadlines</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {deadlines.map((row) => (
            <li
              key={`${row.project_id}-${row.date}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 600 }}>{row.name}</span>
              <time style={{ color: 'var(--color-text-3)', flexShrink: 0 }}>{row.date}</time>
            </li>
          ))}
          {!deadlines.length && !loading && (
            <li style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No upcoming deadlines with dates on file.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
