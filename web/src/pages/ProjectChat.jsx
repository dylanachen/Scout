import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ThreadList from '../components/ThreadList';
import ChatWindow from '../components/ChatWindow';

export default function ProjectChat() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);

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

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <ThreadList projects={projects} selectedId={selected?.id} onSelect={setSelected} />
      <ChatWindow project={selected} />
    </div>
  );
}
