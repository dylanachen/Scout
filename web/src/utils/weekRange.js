function pad(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday 00:00 local through Sunday (inclusive), as YYYY-MM-DD strings */
export function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffFromMon = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(start.getDate() + diffFromMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end), startDate: start, endDate: end };
}

export function isDateInWeek(dateStr, week) {
  return dateStr >= week.start && dateStr <= week.end;
}

/** Labels Mon–Sun for current week */
export function weekDayLabels(week) {
  const [y, m, d] = week.start.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const labels = [];
  const short = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    labels.push({ key: toISODate(x), label: short[i], dayNum: x.getDate() });
  }
  return labels;
}
