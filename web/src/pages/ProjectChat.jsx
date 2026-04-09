import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useTimeTracking } from '../hooks/useTimeTracking';
import ThreadList from '../components/ThreadList';
import ChatWindow from '../components/ChatWindow';
import { mergeProjectStatus } from '../utils/projectStatusLocal';

export default function ProjectChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTimerPanel } = useTimeTracking();
  const [meetingInviteOpen, setMeetingInviteOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusTick, setStatusTick] = useState(0);

  const projectsMerged = useMemo(() => projects.map(mergeProjectStatus), [projects, statusTick]);
  const selectedMerged = useMemo(
    () => (selected ? mergeProjectStatus(selected) : null),
    [selected, statusTick],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/projects');
        if (!cancelled) {
          const list = data ?? [];
          setProjects(list);
          setSelected((prev) => prev ?? list[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          setSelected(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!projects.length) return;
    const pid = location.state?.projectId;
    if (pid == null) return;
    const p = projects.find((x) => String(x.id) === String(pid));
    if (p) setSelected(p);
  }, [location.state?.projectId, projects]);

  useEffect(() => {
    if (!selected?.id) return;
    const st = location.state;
    if (st?.openMeetingInvite && String(st.projectId) === String(selected.id)) {
      setMeetingInviteOpen(true);
      navigate('/chat', { replace: true, state: {} });
    }
  }, [selected?.id, location.state, navigate]);

  useEffect(() => {
    const st = location.state;
    if (st?.openTimer && st?.projectId != null) {
      openTimerPanel(st.projectId);
      navigate('/chat', { replace: true, state: {} });
    }
  }, [location.state, navigate, openTimerPanel]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0, minHeight: 0, width: '100%' }}>
      <ThreadList projects={projectsMerged} selectedId={selected?.id} onSelect={setSelected} />
      <ChatWindow
        project={selectedMerged}
        meetingInviteOpen={meetingInviteOpen}
        onMeetingInviteOpenChange={setMeetingInviteOpen}
        onProjectStatusChanged={() => setStatusTick((t) => t + 1)}
      />
    </div>
  );
}
