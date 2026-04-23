import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import useDemoActive from '../hooks/useDemoActive';
import { useAppTheme } from '../context/ThemeContext';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Skeleton from '../components/states/Skeleton';

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
  active: { bg: '#dcfce7', text: '#15803d', label: 'projectsScreen.status.active' },
  completed: { bg: '#dbeafe', text: '#1d6ecd', label: 'projectsScreen.status.completed' },
  paused: { bg: '#fef3c7', text: '#d97706', label: 'projectsScreen.status.paused' },
};

function ProjectCard({ project, t }: { project: Project; t: (key: string) => string }) {
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
          <Text style={[styles.badgeText, { color: st.text }]}>{t(st.label)}</Text>
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
        <Text style={styles.chatBtnText}>{t('projectsScreen.openChat')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const demoActive = useDemoActive();
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('scout_bookmarked_projects');
      const parsed = raw ? JSON.parse(raw) : [];
      setBookmarkedIds(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setBookmarkedIds(new Set());
    }
  }, []);

  const persistBookmarks = useCallback(async (next: Set<string>) => {
    await AsyncStorage.setItem('scout_bookmarked_projects', JSON.stringify(Array.from(next)));
  }, []);

  const toggleBookmark = useCallback(
    async (projectId: string) => {
      const next = new Set(bookmarkedIds);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      setBookmarkedIds(next);
      await persistBookmarks(next);
    },
    [bookmarkedIds, persistBookmarks],
  );

  const fetchProjects = useCallback(async () => {
    setError('');
    if (demoActive) {
      setProjects(DEMO_PROJECTS);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/projects');
      if (Array.isArray(data)) setProjects(data);
    } catch {
      setError(t('projectsScreen.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [demoActive, t]);

  useEffect(() => {
    fetchProjects();
    loadBookmarks();
  }, [fetchProjects, loadBookmarks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? projects : projects.filter((project) => project.status === statusFilter)),
    [projects, statusFilter],
  );
  const visibleProjects = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleProjects.length;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16, gap: 10 }]}>
        <Skeleton height={90} />
        <Skeleton height={90} />
        <Skeleton height={90} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visibleProjects}
        keyExtractor={(item) => item.id}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.25}
        onEndReached={() => {
          if (hasMore) setVisibleCount((prev) => prev + 6);
        }}
        ListHeaderComponent={(
          <View>
            <Text style={[styles.heading, { color: colors.text }]}>{t('projectsScreen.title')}</Text>
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {t('projectsScreen.projectCount', { count: filtered.length })}
            </Text>
            <View style={styles.filterRow}>
              {(['all', 'active', 'completed', 'paused'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: statusFilter === status ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setStatusFilter(status)}
                  accessibilityRole="button"
                  accessibilityLabel={t('projectsScreen.filterLabel', { status })}
                >
                  <Text style={{ color: statusFilter === status ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>
                    {t(`projectsScreen.filter.${status}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <ErrorState message={error} onRetry={fetchProjects} /> : null}
            {!filtered.length ? <EmptyState title={t('projectsScreen.emptyTitle')} subtitle={t('projectsScreen.emptySubtitle')} /> : null}
          </View>
        )}
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item: project }) => (
          <View>
            <ProjectCard project={project} t={t} />
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => toggleBookmark(project.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  bookmarkedIds.has(project.id)
                    ? t('projectsScreen.removeBookmark')
                    : t('projectsScreen.bookmarkProject')
                }
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                  {bookmarkedIds.has(project.id) ? t('projectsScreen.bookmarked') : t('projectsScreen.bookmark')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => Share.share({ message: t('projectsScreen.shareMessage', { name: project.name }) })}
                accessibilityRole="button"
                accessibilityLabel={t('projectsScreen.shareLabel', { name: project.name })}
                accessibilityHint={t('projectsScreen.shareHint')}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{t('projectsScreen.share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Onboarding')}
        accessibilityRole="button"
        accessibilityLabel={t('projectsScreen.startNewProject')}
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
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
  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: -4, marginBottom: 12 },
  secondaryBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
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
