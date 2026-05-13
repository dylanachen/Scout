import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { getCurrentWeekRange, isDateInWeek, toISODate, weekDayLabels } from '../utils/weekRange';

function hoursFromMinutes(m) {
  return Math.round((m / 60) * 100) / 100;
}

const DATE_FILTERS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'full', label: 'Full Project' },
];

function isDateInMonth(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function WeeklyBarChart({ dayPlanned, dayUnplanned, labels }) {
  const totalMax = Math.max(
    ...labels.map(({ key }) => (dayPlanned[key] || 0) + (dayUnplanned[key] || 0)),
    0.01,
  );
  const h = 120;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: h + 24, paddingTop: 8 }}>
        {labels.map(({ key, label, dayNum }) => {
          const planned = dayPlanned[key] ?? 0;
          const unplanned = dayUnplanned[key] ?? 0;
          const total = planned + unplanned;
          const barH = Math.max(total > 0 ? 4 : 0, (total / totalMax) * h);
          const plannedH = total > 0 ? (planned / total) * barH : 0;
          const unplannedH = total > 0 ? (unplanned / total) * barH : 0;
          return (
            <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }} title={`${total.toFixed(2)} h`}>
                  {unplanned > 0 && (
                    <div style={{ height: unplannedH, borderRadius: planned > 0 ? '6px 6px 0 0' : '6px 6px 2px 2px', background: '#d97706', minHeight: 2 }} />
                  )}
                  {planned > 0 && (
                    <div style={{ height: plannedH, borderRadius: unplanned > 0 ? '0 0 2px 2px' : '6px 6px 2px 2px', background: 'var(--color-primary)', minHeight: 2 }} />
                  )}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-2)', fontVariantNumeric: 'tabular-nums' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }} />
          Planned
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#d97706' }} />
          Unplanned
        </div>
      </div>
    </div>
  );
}

export default function WeeklyTimeSummary() {
  const { entries, projects, addManualEntry, updateEntry, deleteEntry } = useTimeTracking();
  const week = useMemo(() => getCurrentWeekRange(), []);
  const dayMeta = useMemo(() => weekDayLabels(week), [week]);

  const [dateFilter, setDateFilter] = useState('week');

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (dateFilter === 'week') return entries.filter((e) => e?.date && isDateInWeek(e.date, week));
    if (dateFilter === 'month') return entries.filter((e) => e?.date && isDateInMonth(e.date));
    return entries;
  }, [entries, week, dateFilter]);

  const mainProjectName = useMemo(() => {
    const first = filteredEntries.find((e) => e?.projectName);
    return first?.projectName ?? projects?.[0]?.name ?? 'All Projects';
  }, [filteredEntries, projects]);

  const byProject = useMemo(() => {
    const m = new Map();
    for (const e of filteredEntries) {
      const k = String(e.projectId);
      const cur = m.get(k) ?? { name: e.projectName, minutes: 0 };
      cur.minutes += Number(e.durationMinutes) || 0;
      cur.name = e.projectName || cur.name;
      m.set(k, cur);
    }
    return [...m.entries()].map(([id, v]) => ({ id, ...v, hours: hoursFromMinutes(v.minutes) }));
  }, [filteredEntries]);

  const dayPlanned = useMemo(() => {
    const t = {};
    for (const d of dayMeta) t[d.key] = 0;
    for (const e of filteredEntries) {
      if (!e.planned) continue;
      if (!t[e.date]) t[e.date] = 0;
      t[e.date] += (Number(e.durationMinutes) || 0) / 60;
    }
    return t;
  }, [filteredEntries, dayMeta]);

  const dayUnplanned = useMemo(() => {
    const t = {};
    for (const d of dayMeta) t[d.key] = 0;
    for (const e of filteredEntries) {
      if (e.planned) continue;
      if (!t[e.date]) t[e.date] = 0;
      t[e.date] += (Number(e.durationMinutes) || 0) / 60;
    }
    return t;
  }, [filteredEntries, dayMeta]);

  const totalMinutes = filteredEntries.reduce((a, e) => a + (Number(e.durationMinutes) || 0), 0);
  const plannedMinutes = filteredEntries.filter((e) => e.planned).reduce((a, e) => a + (Number(e.durationMinutes) || 0), 0);
  const unplannedMinutes = totalMinutes - plannedMinutes;
  const plannedPct = totalMinutes > 0 ? Math.round((plannedMinutes / totalMinutes) * 100) : 100;
  const unplannedPct = 100 - plannedPct;

  const scopeLinkProjectId = byProject[0]?.id ?? projects?.[0]?.id;

  const [manualProjectId, setManualProjectId] = useState(() => String(projects?.[0]?.id ?? ''));
  const [showManualForm, setShowManualForm] = useState(true);

  useEffect(() => {
    if (projects?.length && !projects.some((p) => String(p.id) === String(manualProjectId))) {
      setManualProjectId(String(projects[0].id));
    }
  }, [projects, manualProjectId]);
  const [manualDate, setManualDate] = useState(() => toISODate(new Date()));
  const [manualHours, setManualHours] = useState('0');
  const [manualMins, setManualMins] = useState('30');
  const [manualDesc, setManualDesc] = useState('');
  const [manualPlanned, setManualPlanned] = useState(true);

  const [editing, setEditing] = useState(null);

  const resetManualForm = () => {
    setManualDesc('');
    setManualMins('30');
    setManualHours('0');
    setManualPlanned(true);
  };

  const saveManual = (e) => {
    e.preventDefault();
    const h = Math.max(0, parseInt(manualHours, 10) || 0);
    const mi = Math.max(0, parseInt(manualMins, 10) || 0);
    const dur = h * 60 + mi;
    if (dur < 1 || !manualProjectId) return;
    const p = projects?.find((x) => String(x.id) === String(manualProjectId));
    addManualEntry({
      projectId: manualProjectId,
      projectName: p?.name ?? `Project ${manualProjectId}`,
      date: manualDate,
      durationMinutes: dur,
      description: manualDesc,
      planned: manualPlanned,
    });
    resetManualForm();
  };

  const groupedEntries = useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const groups = [];
    let currentDate = null;
    for (const entry of sorted) {
      if (entry.date !== currentDate) {
        currentDate = entry.date;
        groups.push({ date: currentDate, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [filteredEntries]);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Time Log — {mainProjectName}
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setDateFilter(f.key)}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: dateFilter === f.key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: dateFilter === f.key ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
                color: dateFilter === f.key ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 24px' }}>
        {dateFilter === 'week' && `${week.start} – ${week.end} (local week, Mon–Sun)`}
        {dateFilter === 'month' && `Current month`}
        {dateFilter === 'full' && `All time entries`}
      </p>

      {/* Planned vs Unplanned summary bar */}
      {totalMinutes > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>
            <span>Planned {plannedPct}%</span>
            <span>Unplanned {unplannedPct}%</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--color-border)' }}>
            {plannedPct > 0 && <div style={{ flex: plannedPct, background: 'var(--color-primary)', borderRadius: 5 }} />}
            {unplannedPct > 0 && <div style={{ flex: unplannedPct, background: '#d97706', borderRadius: 5 }} />}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
            <span>{hoursFromMinutes(plannedMinutes).toFixed(2)} h</span>
            <span>{hoursFromMinutes(unplannedMinutes).toFixed(2)} h</span>
          </div>
        </div>
      )}

      {unplannedPct > 15 && totalMinutes > 0 ? (
        <div
          style={{
            marginBottom: 22,
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--color-severity-med-bg)',
            border: '1px solid #fcd34d',
            fontSize: 13,
            color: 'var(--color-text)',
            lineHeight: 1.5,
          }}
        >
          <strong>Heads up:</strong> {unplannedPct}% of your logged hours are unplanned. This may indicate scope drift.{' '}
          {scopeLinkProjectId ? (
            <Link to={`/projects/${scopeLinkProjectId}/scope-drift`} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
              Open scope drift report
            </Link>
          ) : (
            <Link to="/projects" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
              View projects
            </Link>
          )}
        </div>
      ) : null}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px' }}>Log Time Manually</h2>
        {showManualForm ? (
          <form
            onSubmit={saveManual}
            style={{
              maxWidth: 480,
              padding: '16px 18px',
              borderRadius: 14,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>Project</label>
            <select
              value={manualProjectId}
              onChange={(e) => setManualProjectId(e.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {(projects ?? []).length === 0 ? <option value="">No projects — add one first</option> : null}
              {(projects ?? []).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>Date</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            />
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}>Duration</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  aria-label="Hours"
                  style={{ width: 72, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13 }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>hours</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={manualMins}
                  onChange={(e) => setManualMins(e.target.value)}
                  aria-label="Minutes"
                  style={{ width: 72, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13 }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>minutes</span>
              </div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>Description</label>
            <textarea
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              rows={2}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 8 }}>Planned vs. unplanned</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>
                <input type="radio" name="mplanned" checked={manualPlanned} onChange={() => setManualPlanned(true)} />
                Planned
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="mplanned" checked={!manualPlanned} onChange={() => setManualPlanned(false)} />
                Unplanned
              </label>
              {!manualPlanned ? (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-scope-text)', background: 'var(--color-scope-bg)', padding: '8px 10px', borderRadius: 8 }}>
                  This will count toward your scope drift.
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="submit"
                disabled={!manualProjectId}
                style={{
                  marginTop: 4,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: manualProjectId ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: manualProjectId ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Save entry
              </button>
              <button
                type="button"
                onClick={() => { resetManualForm(); setShowManualForm(false); }}
                style={{
                  marginTop: 4,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-3)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px dashed var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            + Log time manually
          </button>
        )}
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>By project</h2>
        {byProject.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No time logged yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byProject.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-2)' }}>{p.hours.toFixed(2)} h</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>Hours per day</h2>
        <div style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <WeeklyBarChart dayPlanned={dayPlanned} dayUnplanned={dayUnplanned} labels={dayMeta} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>Entries</h2>
        {groupedEntries.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No entries to show.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groupedEntries.map((group) => (
              <div key={group.date}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                  {group.date}
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-2)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Duration</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Tag</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entries.map((row) => (
                        <tr key={row.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 12px', maxWidth: 220 }}>{row.description}</td>
                          <td style={{ padding: '10px 12px' }}>{hoursFromMinutes(row.durationMinutes)} h</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: row.planned ? 'var(--color-text-2)' : '#d97706', fontWeight: row.planned ? 400 : 600 }}>
                              {row.planned ? 'Planned' : 'Unplanned'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              style={{
                                marginRight: 8,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-surface)',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this entry?')) deleteEntry(row.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--color-danger)',
                                color: 'var(--color-danger)',
                                background: 'var(--color-surface)',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, fontSize: 15, fontWeight: 800 }}>
          Total: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hoursFromMinutes(totalMinutes).toFixed(2)}</span> h
        </div>
      </section>

      {editing ? (
        <EditEntryModal
          entry={editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateEntry(editing.id, patch);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EditEntryModal({ entry, projects, onClose, onSave }) {
  const [date, setDate] = useState(entry.date);
  const [description, setDescription] = useState(entry.description);
  const [planned, setPlanned] = useState(!!entry.planned);
  const [h, setH] = useState(String(Math.floor((entry.durationMinutes || 0) / 60)));
  const [m, setM] = useState(String((entry.durationMinutes || 0) % 60));
  const [projectId, setProjectId] = useState(String(entry.projectId));

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(15, 22, 35, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--color-surface)',
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          padding: '20px 20px 16px',
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>Edit entry</h3>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}
        >
          {(projects ?? []).map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <input type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} style={{ width: 64, padding: 8 }} /> h
          <input type="number" min={0} max={59} value={m} onChange={(e) => setM(e.target.value)} style={{ width: 64, padding: 8 }} /> m
        </div>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, fontFamily: 'var(--font-sans)' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <input type="checkbox" checked={planned} onChange={(e) => setPlanned(e.target.checked)} />
          Planned work
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const hh = parseInt(h, 10) || 0;
              const mm = parseInt(m, 10) || 0;
              const p = projects?.find((x) => String(x.id) === String(projectId));
              onSave({
                projectId,
                projectName: p?.name ?? entry.projectName,
                date,
                description,
                planned,
                durationMinutes: Math.max(1, hh * 60 + mm),
              });
            }}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
