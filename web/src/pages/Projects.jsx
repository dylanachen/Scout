import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Projects() {
  const { loading, err, projects } = useDashboardData();

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>Projects</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Everything you are working on right now.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/pipeline"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              background: 'var(--color-surface)',
            }}
          >
            Pipeline
          </Link>
          <Link
            to="/onboarding"
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            New project
          </Link>
        </div>
      </div>

      {err && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{err}</div>
      )}
      {loading && <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-3)' }}>Loading…</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      {!projects.length && !loading && (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 8 }}>No projects yet. Start one to see it here.</p>
      )}

      <Link
        to="/onboarding"
        className="scout-fab"
        aria-label="Start a New Project"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: '#fff',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 300,
          boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
          textDecoration: 'none',
          zIndex: 900,
        }}
      >
        +
      </Link>
    </div>
  );
}
