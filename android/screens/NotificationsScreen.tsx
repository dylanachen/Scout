import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isDemoMode } from '../api/demoAdapter';
import { api } from '../api/client';

type NotifType =
  | 'match'
  | 'message'
  | 'scope'
  | 'invoice'
  | 'meeting'
  | 'milestone'
  | 'time'
  | 'decision_logged'
  | 'change_order'
  | 'asset_reminder';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const ICON_CFG: Record<NotifType, { bg: string; color: string; icon: string }> = {
  match:            { bg: '#dbeafe', color: '#1d6ecd', icon: '\u21C4' },
  message:          { bg: '#e0f2fe', color: '#0369a1', icon: 'M' },
  scope:            { bg: '#fef3c7', color: '#d97706', icon: '!' },
  invoice:          { bg: '#dcfce7', color: '#16a34a', icon: '$' },
  meeting:          { bg: '#f3e8ff', color: '#7c3aed', icon: '\u25B6' },
  milestone:        { bg: '#fce7f3', color: '#db2777', icon: '\u25C6' },
  time:             { bg: '#fff7ed', color: '#ea580c', icon: '\u25F7' },
  decision_logged:  { bg: '#dcfce7', color: '#16a34a', icon: '\u2713' },
  change_order:     { bg: '#fef3c7', color: '#d97706', icon: '\u21BB' },
  asset_reminder:   { bg: '#e0f2fe', color: '#0369a1', icon: '\u2605' },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'match', title: 'New match available', description: 'Riley Chen matches your profile at 91%', time: '2h', read: false },
  { id: '2', type: 'message', title: 'New message', description: 'Jordan Kim: "Sounds great, let\'s move forward"', time: '3h', read: false },
  { id: '3', type: 'scope', title: 'Scope flag raised', description: 'Client requested a 3rd revision round (contract allows 2)', time: '5h', read: false },
  { id: '4', type: 'invoice', title: 'Invoice viewed', description: 'INV-2025-003 was viewed by Jordan Kim', time: 'Yesterday', read: true },
  { id: '5', type: 'meeting', title: 'Meeting summary ready', description: 'Your call with Sam Okonkwo has been summarized', time: 'Yesterday', read: true },
  { id: '6', type: 'milestone', title: 'Milestone due', description: 'Logo concepts due in 3 days for Q2 brand refresh', time: '2d', read: true },
  { id: '7', type: 'time', title: 'Time variance alert', description: '18% of logged hours are unplanned this week', time: '3d', read: true },
  { id: '8', type: 'decision_logged', title: 'Decision logged', description: 'Approved: new color palette for Website Refresh', time: '3d', read: true },
  { id: '9', type: 'change_order', title: 'Change order created', description: 'Extra hero variant for Website Refresh ($400)', time: '4d', read: true },
  { id: '10', type: 'asset_reminder', title: 'Asset reminder', description: 'Final logo files due tomorrow for Brand Identity project', time: '4d', read: true },
];

const FILTER_TABS = ['All', 'Unread', 'Scope', 'Invoices', 'Messages', 'Meetings'];

function NotifIcon({ type }: { type: NotifType }) {
  const cfg = ICON_CFG[type] ?? { bg: '#f1f5f9', color: '#64748b', icon: '\u2022' };
  return (
    <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.iconText, { color: cfg.color }]}>{cfg.icon}</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState<Notification[]>(isDemoMode() ? DEMO_NOTIFICATIONS : []);

  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!cancelled && Array.isArray(data)) setNotifications(data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Scope') return n.type === 'scope' || n.type === 'asset_reminder';
    if (activeTab === 'Invoices') return n.type === 'invoice';
    if (activeTab === 'Messages') return n.type === 'message';
    if (activeTab === 'Meetings') return n.type === 'meeting';
    return true;
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handlePress = (n: Notification) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));

    switch (n.type) {
      case 'match':
        navigation.navigate('Matches');
        break;
      case 'message':
        navigation.navigate('ProjectChat', { projectName: 'Website Refresh' });
        break;
      case 'scope':
      case 'change_order':
        navigation.navigate('ProjectChat', { projectName: 'Website Refresh' });
        break;
      case 'meeting':
      case 'milestone':
      case 'decision_logged':
      case 'asset_reminder':
        navigation.navigate('Dashboard');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Text style={{ fontSize: 24, color: '#9aa0ae' }}>{'\u2714'}</Text>
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>You're all caught up!</Text>
          </View>
        ) : (
          filtered.map((n) => (
            <TouchableOpacity key={n.id} style={styles.notifRow} onPress={() => handlePress(n)} activeOpacity={0.7}>
              {!n.read && <View style={styles.unreadDot} />}
              <NotifIcon type={n.type} />
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>{n.title}</Text>
                <Text style={styles.notifDesc} numberOfLines={1}>{n.description}</Text>
              </View>
              <Text style={styles.notifTime}>{n.time}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623' },
  markAll: { fontSize: 13, fontWeight: '600', color: '#1d6ecd' },
  tabs: { flexGrow: 0, paddingHorizontal: 12 },
  tabsContent: { gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  tabText: { fontSize: 12, fontWeight: '500', color: '#4a5568' },
  tabTextActive: { color: '#fff' },
  list: { padding: 16, gap: 2 },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    marginBottom: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d6ecd',
    position: 'absolute',
    left: 6,
    top: 20,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 16, fontWeight: '700' },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 13, fontWeight: '400', color: '#0f1623' },
  notifTitleUnread: { fontWeight: '700' },
  notifDesc: { fontSize: 12, color: '#9aa0ae', lineHeight: 17 },
  notifTime: { fontSize: 11, color: '#9aa0ae' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0f1623', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#9aa0ae' },
});
