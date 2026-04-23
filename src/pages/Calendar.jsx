import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices } from '../utils/invoiceStorage';
import { lsRead } from '../utils/localStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: new Date(year, month, 1 - (startPad - i)), otherMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), otherMonth: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month, daysInMonth + (cells.length - startPad - daysInMonth + 1)), otherMonth: true });
  }
  return cells;
}

function allEvents() {
  const list = [];
  getInvoices().forEach((inv) => {
    if (inv.dueDate) list.push({ id: `inv-${inv.id}`, date: new Date(inv.dueDate), title: `${inv.invoiceNumber} due`, category: 'invoice', href: '/invoices' });
  });
  const milestoneKeys = Object.keys(localStorage).filter((k) => k.startsWith('scout_milestones_'));
  milestoneKeys.forEach((k) => {
    const board = lsRead(k, { milestones: [] });
    (board.milestones || []).forEach((m) => {
      if (m.dueAt) list.push({ id: `ms-${m.id}`, date: new Date(m.dueAt), title: m.title, category: 'milestone', href: '/projects' });
    });
  });
  return list.filter((e) => !Number.isNaN(e.date.getTime()));
}

export default function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [events] = useState(() => allEvents());

  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const k = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    });
    return map;
  }, [events]);

  const label = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const change = (delta) => {
    const next = new Date(cursor);
    next.setMonth(cursor.getMonth() + delta);
    setCursor(next);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Calendar</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            Invoice due dates, milestones, and key project moments in one view.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => change(-1)} style={navBtn}>‹</button>
          <div style={{ fontWeight: 700, minWidth: 160, textAlign: 'center' }}>{label}</div>
          <button type="button" onClick={() => change(1)} style={navBtn}>›</button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              setCursor(d);
            }}
            style={{ ...navBtn, width: 'auto', padding: '8px 14px' }}
          >
            Today
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface)' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--color-text-3)', borderBottom: '1px solid var(--color-border)' }}>
            {d}
          </div>
        ))}
        {grid.map((cell, i) => {
          const k = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const dayEvents = eventsByDay.get(k) || [];
          const isToday = sameDate(cell.date, today);
          return (
            <div
              key={i}
              style={{
                minHeight: 90,
                borderRight: (i % 7) !== 6 ? '1px solid var(--color-border)' : 'none',
                borderBottom: i < grid.length - 7 ? '1px solid var(--color-border)' : 'none',
                padding: 6,
                background: cell.otherMonth ? 'var(--color-surface-2)' : 'var(--color-surface)',
                color: cell.otherMonth ? 'var(--color-text-3)' : 'var(--color-text)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--color-primary)' : undefined, marginBottom: 4 }}>
                {cell.date.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    to={e.href}
                    style={{
                      display: 'block',
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: e.category === 'invoice' ? '#dbeafe' : '#fef3c7',
                      color: e.category === 'invoice' ? '#1e40af' : '#92400e',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.title}
                  </Link>
                ))}
                {dayEvents.length > 3 ? (
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>+{dayEvents.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  fontSize: 16,
  color: 'var(--color-text-2)',
};
