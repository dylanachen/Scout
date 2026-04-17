import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import useDemoActive from '../hooks/useDemoActive';

/* ── Helpers ───────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ── Demo data ─────────────────────────────────────────── */

const METRICS = [
  { label: 'Active Projects', value: '2', bg: '#dbeafe', accent: '#1d6ecd', icon: '\u25C6' },
  { label: 'Hours This Week', value: '24.5', bg: '#dcfce7', accent: '#16a34a', icon: '\u25F7' },
  { label: 'Pending Invoices', value: '1', bg: '#fef3c7', accent: '#16a34a', icon: '$' },
  { label: 'Unread Messages', value: '3', bg: '#fce7f3', accent: '#db2777', icon: 'M' },
];

const DEMO_PROJECTS = [
  { id: 'p1', name: 'Website Refresh', client: 'Northwind LLC', progress: 65, status: 'in_progress', deadline: '2025-06-15', unread: 2 },
  { id: 'p2', name: 'Pitch Deck', client: 'Blue Harbor', progress: 30, status: 'pending_match', deadline: '2025-06-08', unread: 0 },
];

const DEMO_MATCHES = [
  { id: 'm1', name: 'Priya Sharma', specialty: 'UX/UI Design', score: 94 },
  { id: 'm2', name: 'Leo Martinez', specialty: 'Full-Stack Dev', score: 89 },
  { id: 'm3', name: 'Ava Chen', specialty: 'Brand Strategy', score: 85 },
];

const DEMO_ACTIVITY = [
  { id: 'a1', text: 'Jordan Kim sent a message in Website Refresh', time: '2h ago', type: 'message' },
  { id: 'a2', text: 'Invoice INV-2025-003 viewed by Jordan Kim', time: '5h ago', type: 'invoice' },
  { id: 'a3', text: 'Meeting with Sam Okonkwo summarized', time: 'Yesterday', type: 'meeting' },
  { id: 'a4', text: 'Scope flag: 3rd revision round requested', time: 'Yesterday', type: 'scope' },
  { id: 'a5', text: 'Logo concepts milestone due in 3 days', time: '2d ago', type: 'milestone' },
];

const ACTIVITY_ICONS: Record<string, { bg: string; icon: string; color: string }> = {
  message: { bg: '#dbeafe', icon: 'M', color: '#1d6ecd' },
  invoice: { bg: '#dcfce7', icon: '$', color: '#16a34a' },
  meeting: { bg: '#f3e8ff', icon: '\u25B6', color: '#7c3aed' },
  scope: { bg: '#fef3c7', icon: '!', color: '#d97706' },
  milestone: { bg: '#fce7f3', icon: '\u25C6', color: '#db2777' },
};

/* ── Components ────────────────────────────────────────── */

function MetricCard({ label, value, bg, accent, icon }: typeof METRICS[0]) {
  const isInvoice = label === 'Pending Invoices';
  return (
    <View style={[styles.metric, { backgroundColor: bg }]}>
      <View style={[styles.metricIcon, { backgroundColor: accent }]}>
        <Text style={styles.metricIconText}>{icon}</Text>
      </View>
      <Text style={[styles.metricValue, { color: accent }]}>
        {isInvoice ? <Text style={{ color: '#16a34a' }}>$</Text> : null}
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: typeof DEMO_PROJECTS[0]; onPress: () => void }) {
  const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
    in_progress: { bg: '#dbeafe', color: '#1d6ecd', label: 'In Progress' },
    pending_match: { bg: '#eff6ff', color: '#1d6ecd', label: 'Pending Match' },
    completed: { bg: '#dcfce7', color: '#16a34a', label: 'Completed' },
    overdue: { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
  };
  const st = STATUS_MAP[project.status] ?? STATUS_MAP.in_progress;
  const daysLeft = project.deadline ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000) : null;
  const deadlineColor = daysLeft != null && daysLeft < 0 ? '#dc2626' : daysLeft != null && daysLeft < 7 ? '#d97706' : '#9aa0ae';

  return (
    <View style={styles.projectCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={styles.projectName}>{project.name}</Text>
        <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: st.color, textTransform: 'uppercase' }}>{st.label}</Text>
        </View>
      </View>
      <Text style={styles.projectClient}>{project.client}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 10 }}>
        {project.deadline ? (
          <Text style={{ fontSize: 11, color: deadlineColor }}>
            {'\u{1F4C5}'} {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {daysLeft != null && daysLeft < 0 ? ' (overdue)' : daysLeft != null && daysLeft < 7 ? ` (${daysLeft}d)` : ''}
          </Text>
        ) : null}
        {project.unread > 0 ? (
          <Text style={{ fontSize: 11, color: '#1d6ecd', fontWeight: '700' }}>
            {'\u{1F4AC}'} {project.unread} new
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={{ backgroundColor: '#1d6ecd', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Open Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

function ActivityRow({ item }: { item: typeof DEMO_ACTIVITY[0] }) {
  const iconCfg = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.message;
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: iconCfg.bg }]}>
        <Text style={[styles.activityIconText, { color: iconCfg.color }]}>{iconCfg.icon}</Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={2}>{item.text}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  );
}

function MatchPreview({ match }: { match: typeof DEMO_MATCHES[0] }) {
  return (
    <View style={styles.matchPreview}>
      <View style={styles.matchAvatar}>
        <Text style={styles.matchAvatarText}>{match.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.matchName}>{match.name}</Text>
        <Text style={styles.matchSpecialty}>{match.specialty}</Text>
      </View>
      <View style={styles.matchScoreBadge}>
        <Text style={styles.matchScoreText}>{match.score}%</Text>
      </View>
    </View>
  );
}

/* ── Screen ────────────────────────────────────────────── */

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const demoActive = useDemoActive();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [matchesExpanded, setMatchesExpanded] = useState(false);
  const [projects, setProjects] = useState<typeof DEMO_PROJECTS>([]);
  const [matches, setMatches] = useState<typeof DEMO_MATCHES>([]);
  const [activity, setActivity] = useState<typeof DEMO_ACTIVITY>([]);
  const [metrics, setMetrics] = useState(METRICS.map((m) => ({ ...m, value: '—' })));

  useEffect(() => {
    if (demoActive) {
      setProjects(DEMO_PROJECTS);
      setMatches(DEMO_MATCHES);
      setActivity(DEMO_ACTIVITY);
      setMetrics(METRICS);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/dashboard/summary');
        if (cancelled) return;
        if (data.projects) setProjects(data.projects);
        if (data.pending_matches) setMatches(data.pending_matches);
        if (data.notifications) setActivity(data.notifications.map((n: any) => ({ id: n.id, text: n.text, time: n.at, type: 'message' })));
        if (data.stats) {
          setMetrics([
            { label: 'Active Projects', value: String(data.stats.active_projects ?? 0), bg: '#dbeafe', accent: '#1d6ecd', icon: '\u25C6' },
            { label: 'Hours This Week', value: String(data.stats.hours_logged_week ?? 0), bg: '#dcfce7', accent: '#16a34a', icon: '\u25F7' },
            { label: 'Pending Invoices', value: String(data.stats.pending_invoices_count ?? 0), bg: '#fef3c7', accent: '#16a34a', icon: '$' },
            { label: 'Unread Messages', value: String(data.stats.unread_messages ?? 0), bg: '#fce7f3', accent: '#db2777', icon: 'M' },
          ]);
        }
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [demoActive]);

  const handleMetricPress = (label: string) => {
    switch (label) {
      case 'Active Projects':
        navigation.navigate('Projects');
        break;
      case 'Pending Invoices':
        navigation.navigate('Invoices');
        break;
      case 'Unread Messages':
        navigation.navigate('Notifications');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName} {'\u{1F44B}'}
        </Text>
        <Text style={styles.date}>{formatDate()}</Text>

        {/* Metric cards */}
        <View style={styles.metricsGrid}>
          {metrics.map((m) => (
            <TouchableOpacity
              key={m.label}
              activeOpacity={0.7}
              onPress={() => handleMetricPress(m.label)}
              style={{ width: '48%', flexGrow: 1, minWidth: 150 }}
            >
              <MetricCard {...m} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Active projects */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {projects.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll} contentContainerStyle={styles.projectScrollContent}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onPress={() => navigation.navigate('ProjectChat', { projectId: p.id, projectName: p.name })}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyProjects}>
            <Text style={styles.emptyTitle}>No active projects</Text>
            <Text style={styles.emptyDesc}>When you start a project, it will appear here.</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate('Onboarding')}
            >
              <Text style={styles.emptyAddBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Matches (collapsible) */}
        <TouchableOpacity
          style={styles.matchesHeader}
          activeOpacity={0.7}
          onPress={() => setMatchesExpanded(!matchesExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Pending Matches</Text>
            <View style={styles.matchCountBadge}>
              <Text style={styles.matchCountText}>{matches.length}</Text>
            </View>
          </View>
          <Text style={[styles.matchArrow, matchesExpanded && styles.matchArrowOpen]}>
            {'\u25B6'}
          </Text>
        </TouchableOpacity>

        {matchesExpanded && (
          <View style={styles.matchesList}>
            {matches.map((m) => (
              <MatchPreview key={m.id} match={m} />
            ))}
          </View>
        )}

        {/* Recent activity */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Recent Activity</Text>
        {activity.map((a) => (
          <ActivityRow key={a.id} item={a} />
        ))}

        <TouchableOpacity
          style={styles.viewAllNotifs}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.viewAllNotifsText}>View all notifications</Text>
        </TouchableOpacity>

        {/* Start a New Project button */}
        <TouchableOpacity
          style={styles.newProjectBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.newProjectBtnText}>Start a New Project</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FAB */}
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
  content: { padding: 16, paddingBottom: 100 },

  greeting: { fontSize: 24, fontWeight: '700', color: '#0f1623', marginBottom: 4 },
  date: { fontSize: 14, color: '#9aa0ae', marginBottom: 20 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  metric: {
    borderRadius: 14,
    padding: 16,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricIconText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  metricValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '500', color: '#4a5568' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f1623' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#1d6ecd' },

  projectScroll: { flexGrow: 0, marginBottom: 4 },
  projectScrollContent: { gap: 12, paddingRight: 4 },
  projectCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  projectName: { fontWeight: '700', fontSize: 15, color: '#0f1623', marginBottom: 3 },
  projectClient: { fontSize: 12, color: '#9aa0ae', marginBottom: 12 },
  projectProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectProgressBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e8ecf2', overflow: 'hidden' },
  projectProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#1d6ecd' },
  projectProgressLabel: { fontSize: 11, fontWeight: '600', color: '#4a5568' },

  emptyProjects: {
    borderWidth: 2,
    borderColor: '#e2e6ed',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#0f1623', marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: '#9aa0ae', textAlign: 'center', marginBottom: 12 },
  emptyAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddBtnText: { color: '#fff', fontSize: 22, fontWeight: '600', marginTop: -1 },

  matchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 6,
  },
  matchCountBadge: {
    backgroundColor: '#1d6ecd',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  matchCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  matchArrow: { fontSize: 12, color: '#9aa0ae' },
  matchArrowOpen: { transform: [{ rotate: '90deg' }] },
  matchesList: { gap: 8, marginBottom: 4 },
  matchPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e6ed',
  },
  matchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAvatarText: { color: '#1d6ecd', fontWeight: '700', fontSize: 14 },
  matchName: { fontSize: 14, fontWeight: '600', color: '#0f1623' },
  matchSpecialty: { fontSize: 12, color: '#9aa0ae' },
  matchScoreBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  matchScoreText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },

  viewAllNotifs: { alignItems: 'center', marginTop: 4, marginBottom: 8, paddingVertical: 8 },
  viewAllNotifsText: { color: '#1d6ecd', fontSize: 13, fontWeight: '600' },

  newProjectBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  newProjectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: -2 },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 14,
    marginBottom: 8,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { fontSize: 14, fontWeight: '700' },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: '#0f1623', lineHeight: 19, marginBottom: 3 },
  activityTime: { fontSize: 11, color: '#9aa0ae' },
});
