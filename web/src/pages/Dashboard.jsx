import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import MetricCard from '../components/MetricCard';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, inv] = await Promise.all([api.get('/projects'), api.get('/invoices')]);
        if (!cancelled) {
          setProjects(p.data ?? []);
          setInvoices(inv.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setErr('Could not load dashboard — start the FastAPI backend or check VITE_API_URL.');
          setProjects([]);
          setInvoices([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openInvoices = invoices.filter((i) => i.status !== 'paid').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Dashboard</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 24 }}>Projects, invoices, and quick links.</p>

      {err && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <MetricCard label="Active projects" value={String(projects.length)} />
        <MetricCard label="Open invoices" value={String(openInvoices)} />
        <MetricCard label="Team" value="Pylovers" hint="DSCI 560 — Freelancer–client AI comms" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        <Link
          to="/chat"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Open project chat
        </Link>
        <Link
          to="/invoices"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontWeight: 500,
            fontSize: 13,
            textDecoration: 'none',
            background: 'var(--color-surface)',
          }}
        >
          View invoices
        </Link>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Projects</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((p) => (
          <li
            key={p.id}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: 13,
            }}
          >
            <strong>{p.name}</strong>
            {p.client_name && <span style={{ color: 'var(--color-text-3)' }}> · {p.client_name}</span>}
          </li>
        ))}
        {!projects.length && !err && <li style={{ color: 'var(--color-text-3)', fontSize: 13 }}>No projects returned from API.</li>}
      </ul>
    </div>
  );
}
