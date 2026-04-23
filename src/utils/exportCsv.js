function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows, columns) {
  if (!rows || rows.length === 0) return '';
  const cols =
    columns || Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));
  const headerLine = cols.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const val = typeof c.value === 'function' ? c.value(r) : r[c.key];
          return escapeCell(val);
        })
        .join(','),
    )
    .join('\n');
  return `${headerLine}\n${body}\n`;
}

export function downloadBlob(filename, content, mime = 'text/plain') {
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 120);
  } catch {
    /* noop */
  }
}

export function downloadCsv(filename, rows, columns) {
  downloadBlob(filename, toCsv(rows, columns), 'text/csv');
}

export function downloadJson(filename, obj) {
  downloadBlob(filename, JSON.stringify(obj, null, 2), 'application/json');
}

export function collectAllLocalStorage() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const v = localStorage.getItem(k);
    try {
      out[k] = JSON.parse(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
