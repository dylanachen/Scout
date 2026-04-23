import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_MATCHES } from '../data/mockMatches';
import { getInvoices } from '../utils/invoiceStorage';
import EmptyState from '../components/EmptyState';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'projects', label: 'Projects' },
  { id: 'freelancers', label: 'Freelancers' },
  { id: 'invoices', label: 'Invoices' },
];

function matchesQuery(q, text) {
  if (!q) return true;
  if (!text) return false;
  return String(text).toLowerCase().includes(q.toLowerCase());
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');

  const results = useMemo(() => {
    const q = query.trim();
    const freelancers = (MOCK_MATCHES || []).filter((m) => matchesQuery(q, `${m.name} ${m.specialty} ${m.role}`));
    const projects = (MOCK_MATCHES || []).filter((m) => matchesQuery(q, `${m.projectName} ${m.projectSummary}`));
    const invoices = getInvoices().filter((inv) => matchesQuery(q, `${inv.invoiceNumber} ${inv.clientName} ${inv.projectName}`));
    return { freelancers, projects, invoices };
  }, [query]);

  const showFreelancers = tab === 'all' || tab === 'freelancers';
  const showProjects = tab === 'all' || tab === 'projects';
  const showInvoices = tab === 'all' || tab === 'invoices';
  const hasAny = results.freelancers.length + results.projects.length + results.invoices.length > 0;

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Search</h1>
      <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--color-text-3)' }}>
        Search across projects, freelancers, and invoices.
      </p>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects, people, skills, invoices…"
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontSize: 15,
          marginBottom: 14,
        }}
        aria-label="Search query"
      />

      <div role="tablist" aria-label="Search filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: tab === t.id ? 'var(--color-primary)' : 'var(--color-surface)',
              color: tab === t.id ? '#fff' : 'var(--color-text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hasAny ? <EmptyState title="No results" body="Try a different keyword or check your filters." /> : null}

      {showProjects && results.projects.length ? (
        <Section title="Projects">
          {results.projects.map((m) => (
            <Link key={`proj-${m.id}`} to={`/matches`} style={rowStyle}>
              <div style={{ fontWeight: 600 }}>{m.projectName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{m.projectSummary}</div>
            </Link>
          ))}
        </Section>
      ) : null}

      {showFreelancers && results.freelancers.length ? (
        <Section title="Freelancers & matches">
          {results.freelancers.map((m) => (
            <Link key={`free-${m.id}`} to={`/profile/${m.username || m.id}`} style={rowStyle}>
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{m.role} · {m.specialty}</div>
            </Link>
          ))}
        </Section>
      ) : null}

      {showInvoices && results.invoices.length ? (
        <Section title="Invoices">
          {results.invoices.map((inv) => (
            <Link key={`inv-${inv.id}`} to="/invoices" style={rowStyle}>
              <div style={{ fontWeight: 600 }}>{inv.invoiceNumber} · {inv.clientName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{inv.projectName}</div>
            </Link>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-3)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </section>
  );
}

const rowStyle = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  textDecoration: 'none',
  color: 'inherit',
};
