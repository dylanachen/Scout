import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import useDemoActive from '../hooks/useDemoActive';

type Project = {
  id: string;
  name: string;
  clientName: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
};

const DEMO_PROJECTS: Project[] = [
  { id: 'p1', name: 'Website Refresh', clientName: 'Northwind LLC', status: 'active', progress: 65 },
  { id: 'p2', name: 'Pitch Deck', clientName: 'Blue Harbor', status: 'active', progress: 30 },
  { id: 'p3', name: 'Brand Identity', clientName: 'Greenfield Co', status: 'completed', progress: 100 },
  { id: 'p4', name: 'Mobile App MVP', clientName: 'TechStart Inc', status: 'paused', progress: 45 },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#dcfce7', text: '#15803d', label: 'Active' },
  completed: { bg: '#dbeafe', text: '#1d6ecd', label: 'Completed' },
  paused: { bg: '#fef3c7', text: '#d97706', label: 'Paused' },
};

function ProjectCard({ project }: { project: Project }) {
  const navigation = useNavigation<any>();
  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES.active;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{project.name}</Text>
          <Text style={styles.cardClient}>{project.clientName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{project.progress}%</Text>
      </View>

      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => navigation.navigate('ProjectChat', { projectId: project.id, projectName: project.name })}
      >
        <Text style={styles.chatBtnText}>Open Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProjectsScreen() {
  const navigation = useNavigation<any>();
  const demoActive = useDemoActive();
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchProjects = useCallback(async () => {
    if (demoActive) {
      setProjects(DEMO_PROJECTS);
      return;
    }
    try {
      const { data } = await api.get('/projects');
      if (Array.isArray(data)) setProjects(data);
    } catch { /* backend unavailable */ }
  }, [demoActive]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  if (projects.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d6ecd" />}
      >
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptyDesc}>Your active projects will appear here.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d6ecd" />}
      >
        <Text style={styles.heading}>Projects</Text>
        <Text style={styles.count}>{projects.length} project{projects.length !== 1 ? 's' : ''}</Text>

        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Onboarding')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623', marginBottom: 4 },
  count: { fontSize: 13, color: '#9aa0ae', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardName: { fontWeight: '700', fontSize: 16, color: '#0f1623', marginBottom: 3 },
  cardClient: { fontSize: 13, color: '#9aa0ae' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e8ecf2', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#1d6ecd' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#4a5568', width: 36, textAlign: 'right' },
  chatBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 32 },
  emptyBox: {
    borderWidth: 2,
    borderColor: '#e2e6ed',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0f1623', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#9aa0ae', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d6ecd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: -2 },
});
