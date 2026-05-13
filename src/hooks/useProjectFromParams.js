import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDashboardData } from './useDashboardData';

export function useProjectFromParams() {
  const { projectId } = useParams();
  const { projects, loading } = useDashboardData();
  const project = useMemo(() => projects.find((p) => p.id === String(projectId)), [projects, projectId]);
  return {
    projectId: projectId != null ? String(projectId) : '',
    project,
    loading,
    projectName: project?.name ?? 'Project',
  };
}
