/** Client testimonials; “pending review” simulated with a short delay flag. */

const KEY = 'scout_testimonials_v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function write(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function getTestimonialsForFreelancer(freelancerId) {
  const id = String(freelancerId);
  return read().filter((t) => String(t.freelancerId) === id && t.status === 'approved');
}

export function addTestimonialSubmission({ freelancerId, freelancerName, projectId, rating, text, clientName }) {
  const rows = read();
  const row = {
    id: `tst_${Date.now()}`,
    freelancerId: String(freelancerId),
    freelancerName,
    projectId,
    rating,
    text: text?.trim() || '',
    clientName: clientName || 'Client',
    status: 'pending_review',
    submittedAt: new Date().toISOString(),
  };
  rows.push(row);
  write(rows);

  window.setTimeout(() => {
    const cur = read();
    const idx = cur.findIndex((x) => x.id === row.id);
    if (idx === -1) return;
    cur[idx] = { ...cur[idx], status: 'approved', reviewedAt: new Date().toISOString() };
    write(cur);
  }, 1800);

  return row;
}
