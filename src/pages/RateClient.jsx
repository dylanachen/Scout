import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjectFromParams } from '../hooks/useProjectFromParams';
import RateClientModal from '../components/RateClientModal';
import { clientKeyFromProject } from '../utils/clientReputationStorage';
import { markClientRatingPromptDone } from '../utils/completionPrompts';

export default function RateClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { project, loading, projectId } = useProjectFromParams();

  if (!loading && user?.role === 'client') {
    return <Navigate to="/" replace />;
  }

  if (!loading && !project) {
    return <Navigate to="/projects" replace />;
  }

  const clientName = project?.client_name ?? 'Client';
  const clientKey = clientKeyFromProject(project ?? {});

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 88px' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 16,
          padding: '8px 0',
          border: 'none',
          background: 'none',
          color: 'var(--color-primary)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        ← Back
      </button>
      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>Loading…</p>
      ) : (
        <RateClientModal
          open
          embedded
          clientName={clientName}
          clientKey={clientKey}
          projectId={projectId}
          onSubmitted={() => markClientRatingPromptDone(projectId)}
          onSkip={() => markClientRatingPromptDone(projectId)}
          onClose={() => navigate('/projects')}
        />
      )}
    </div>
  );
}
