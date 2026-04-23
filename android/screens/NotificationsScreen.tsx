import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import useDemoActive from '../hooks/useDemoActive';
import FilterPillTabs, { type FilterPillTab } from '../components/FilterPillTabs';
import EmptyState from '../components/states/EmptyState';
import Skeleton from '../components/states/Skeleton';
import ErrorState from '../components/states/ErrorState';
import { useTranslation } from 'react-i18next';

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

type NotifFilterTab = 'All' | 'Unread' | 'Scope' | 'Invoices' | 'Messages' | 'Meetings';

const FILTER_TABS: FilterPillTab<NotifFilterTab>[] = [
  { value: 'All', label: 'All' },
  { value: 'Unread', label: 'Unread' },
  { value: 'Scope', label: 'Scope' },
  { value: 'Invoices', label: 'Invoices' },
  { value: 'Messages', label: 'Messages' },
  { value: 'Meetings', label: 'Meetings' },
];

function NotifIcon({ type }: { type: NotifType }) {
  const cfg = ICON_CFG[type] ?? { bg: '#f1f5f9', color: '#64748b', icon: '\u2022' };
  return (
    <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.iconText, { color: cfg.color }]}>{cfg.icon}</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const demoActive = useDemoActive();
  const [activeTab, setActiveTab] = useState<NotifFilterTab>('All');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    setError('');
    if (demoActive) {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/notifications');
      if (Array.isArray(data)) setNotifications(data);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [demoActive]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
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
        <Text style={styles.heading}>{t('notifications.title')}</Text>
        <TouchableOpacity onPress={markAllRead} accessibilityRole="button" accessibilityLabel={t('notifications.markAllRead')}>
          <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      </View>

      <FilterPillTabs tabs={FILTER_TABS} active={activeTab} onChange={setActiveTab} />

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <Skeleton height={58} />
            <Skeleton height={58} />
            <Skeleton height={58} />
          </View>
        ) : null}
        {error ? <ErrorState message={error} onRetry={() => void fetchNotifications()} /> : null}
        {filtered.length === 0 && !loading ? (
          <EmptyState title={t('notifications.empty')} subtitle={t('notifications.caughtUp')} />
        ) : (
          filtered.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifRow}
              onPress={() => handlePress(n)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={n.title}
              accessibilityHint="Open related screen and mark notification as read"
            >
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

});
