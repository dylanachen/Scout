import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';
import ScopeAlert, { type ScopeAlertPayload } from '../components/ScopeAlert';

type Msg = {
  id?: string;
  text?: string;
  sender_id?: number;
  sender_name?: string;
  timestamp?: string;
  read?: boolean;
  role?: 'stakeholder' | 'ai_public' | 'ai_private';
  status?: 'sent' | 'delivered' | 'read';
};

const DEMO_CHAT_SEED = (): Msg[] => [
  {
    id: 'demo-m1',
    text: 'Hey \u2014 can we add one more hero variant before launch?',
    sender_id: 2,
    sender_name: 'Jordan (Client)',
    timestamp: '2025-04-07T10:30:00',
    read: true,
  },
  {
    id: 'demo-m2',
    text: "Yes, happy to scope that. I'll send a mini change order.",
    sender_id: 1,
    sender_name: 'Demo Freelancer',
    timestamp: '2025-04-07T10:32:00',
    read: true,
    status: 'read',
  },
  {
    id: 'demo-m3',
    text: 'Perfect, thanks! Also \u2014 can we chat about the timeline tomorrow?',
    sender_id: 2,
    sender_name: 'Jordan (Client)',
    timestamp: '2025-04-08T09:15:00',
    read: true,
  },
  {
    id: 'demo-m4',
    text: "Sure, I'm free after 2 PM. I'll send a calendar invite.",
    sender_id: 1,
    sender_name: 'Demo Freelancer',
    timestamp: '2025-04-08T09:17:00',
    read: false,
    status: 'delivered',
  },
  {
    id: 'demo-m5',
    text: "I've flagged this as potential scope creep. The original contract covers 2 revision rounds.",
    sender_id: 0,
    sender_name: 'FreelanceOS AI',
    timestamp: '2025-04-08T09:20:00',
    read: false,
    role: 'ai_public',
  },
  {
    id: 'demo-m6',
    text: 'Scope flag: Client is requesting a 3rd revision. Your contract allows 2. Consider sending a change order.',
    sender_id: 0,
    sender_name: 'FreelanceOS AI',
    timestamp: '2025-04-08T09:21:00',
    read: false,
    role: 'ai_private',
  },
  {
    id: 'demo-m7',
    text: 'Hey team, I think we should align on the color direction before the next revision.',
    sender_id: 3,
    sender_name: 'Alex (Stakeholder)',
    timestamp: '2025-04-08T09:25:00',
    read: false,
    role: 'stakeholder',
  },
];

const MENU_ITEMS = [
  'View Contract',
  'Pull Scope Drift Report',
  'View Decision Log',
  'Invite Stakeholder',
  'Project Settings',
  'Archive Project',
];

function formatMsgDate(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shouldShowDateSep(curr: Msg, prev?: Msg) {
  if (!curr.timestamp) return false;
  if (!prev?.timestamp) return true;
  return new Date(curr.timestamp).toDateString() !== new Date(prev.timestamp).toDateString();
}

/* ── Header icons (View-based) ────────────────────────── */

function BackChevron() {
  return (
    <View style={{ width: 10, height: 10, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#0f1623', transform: [{ rotate: '45deg' }] }} />
  );
}

function VideoIcon() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 16, height: 12, borderRadius: 2, backgroundColor: '#4a5568' }} />
      <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderTopWidth: 5, borderBottomWidth: 5, borderLeftColor: '#4a5568', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 2 }} />
    </View>
  );
}

function MenuDots() {
  return (
    <View style={{ gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#4a5568' }} />
      ))}
    </View>
  );
}

/* ── Read receipts ────────────────────────────────────── */

function ReadReceipt({ read, status }: { read?: boolean; status?: 'sent' | 'delivered' | 'read' }) {
  const s = status ?? (read ? 'read' : 'delivered');
  const color = s === 'read' ? '#1d6ecd' : '#9aa0ae';

  if (s === 'sent') {
    return (
      <View style={{ flexDirection: 'row', marginTop: 4, alignSelf: 'flex-end' }}>
        <Text style={{ fontSize: 10, color: '#9aa0ae' }}>{'\u2713'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 1, marginTop: 4, alignSelf: 'flex-end' }}>
      <Text style={{ fontSize: 10, color }}>{'\u2713'}</Text>
      <Text style={{ fontSize: 10, color, marginLeft: -3 }}>{'\u2713'}</Text>
    </View>
  );
}

/* ── Chat screen ──────────────────────────────────────── */

type Props = {
  navigation?: any;
  route?: any;
};

export default function ChatScreen({ navigation, route }: Props) {
  const params = route?.params as { projectName?: string; projectId?: string } | undefined;
  const projectName = params?.projectName || 'Project Chat';

  const [projectId, setProjectId] = useState<string | null>(params?.projectId || null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [scopeAlerts, setScopeAlerts] = useState<ScopeAlertPayload[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  /* ── project resolution ── */
  useEffect(() => {
    if (params?.projectId) {
      setProjectId(params.projectId);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/projects');
        const list = data as { id: string | number }[];
        if (!cancelled && list?.length) setProjectId(String(list[0].id));
      } catch {
        if (!cancelled) setProjectId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [params?.projectId]);

  /* ── websocket ── */
  const connect = useCallback(async () => {
    if (isDemoMode()) return;
    wsRef.current?.close();
    if (!projectId) return;
    const token = (await AsyncStorage.getItem('fos_token')) ?? '';
    const base = (process.env.EXPO_PUBLIC_WS_URL ?? 'ws://10.0.2.2:8000').replace(/\/$/, '');
    const url = `${base}/ws/chat/${projectId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === 'history' && Array.isArray(data.payload)) { setMessages(data.payload); return; }
        if (data.type === 'message' && data.payload) { setMessages((m) => [...m, data.payload]); return; }
        if (data.type === 'scope_alert' && data.payload) {
          const p = data.payload as ScopeAlertPayload;
          setScopeAlerts((prev) => [{ ...p, id: p.id ?? `scope_${Date.now()}` }, ...prev]);
        }
      } catch { /* ignore */ }
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setScopeAlerts([]);
      setConnected(false);
      return;
    }
    if (isDemoMode()) {
      setMessages(DEMO_CHAT_SEED());
      setConnected(true);
      return;
    }
    setConnected(false);
    setMessages([]);
    connect();
    return () => wsRef.current?.close();
  }, [projectId, connect]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, scopeAlerts]);

  /* ── actions ── */
  const dismissAlert = (id: string) => setScopeAlerts((prev) => prev.filter((a) => a.id !== id));

  const send = () => {
    const t = input.trim();
    if (!t) return;
    if (isDemoMode()) {
      setMessages((m) => [...m, {
        id: `demo-local-${Date.now()}`,
        text: t,
        sender_id: 1,
        sender_name: 'Demo Freelancer',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sent',
      }]);
      setInput('');
      return;
    }
    if (!connected) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text: t }));
    }
    setInput('');
  };

  const handleMenuItem = (label: string) => {
    setMenuOpen(false);
    switch (label) {
      case 'View Contract':
        navigation?.navigate('Projects', { highlightContract: projectId });
        break;
      case 'Pull Scope Drift Report':
        navigation?.navigate('Projects', { showScopeDrift: projectId });
        break;
      case 'View Decision Log':
        Alert.alert('Decision Log', 'The full decision log will be available in an upcoming update.');
        break;
      case 'Invite Stakeholder':
        Alert.alert('Invite Stakeholder', 'Stakeholder invitations will be available in an upcoming update.');
        break;
      case 'Project Settings':
        navigation?.navigate('Settings');
        break;
      case 'Archive Project':
        Alert.alert('Archive Project', 'Are you sure you want to archive this project? You can restore it later.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Archive', style: 'destructive', onPress: () => navigation?.navigate('Projects') },
        ]);
        break;
      default:
        break;
    }
  };

  /* ── derived state ── */
  const orphanAlerts = scopeAlerts.filter((a) => !a.after_message_id);
  const unreadFromOthers = messages.filter((m) => m.sender_id !== 1 && !m.read);
  const showCatchUp = !catchUpDismissed && unreadFromOthers.length > 0;

  /* ── empty state ── */
  if (!projectId) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.muted}>No projects loaded.</Text>
        <Text style={[styles.muted, { marginTop: 10 }]}>
          {isDemoMode() ? 'Try signing in again.' : 'Start FastAPI or enable EXPO_PUBLIC_DEMO_MODE=true.'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {navigation?.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={10}>
            <BackChevron />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{projectName}</Text>
          <View style={styles.headerSub}>
            <Text style={styles.headerParticipant}>Jordan Kim</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>In Progress</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} hitSlop={10}>
            <VideoIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} hitSlop={10} onPress={() => setMenuOpen(true)}>
            <MenuDots />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Three-dot menu modal ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((label) => (
              <TouchableOpacity key={label} style={styles.menuItem} onPress={() => handleMenuItem(label)}>
                <Text style={styles.menuItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Messages ── */}
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.list}>
        {/* Catch-up banner */}
        {showCatchUp && (
          <View style={styles.catchUp}>
            <Text style={styles.catchUpTitle}>{"Here\u2019s what you missed \ud83d\udc4b"}</Text>
            {unreadFromOthers.map((m) => (
              <Text key={m.id} style={styles.catchUpBullet}>
                {'\u2022 '}
                <Text style={styles.catchUpBold}>{m.sender_name}: </Text>
                {(m.text ?? '').length > 60 ? (m.text ?? '').slice(0, 60) + '\u2026' : m.text}
              </Text>
            ))}
            <TouchableOpacity style={styles.catchUpBtn} onPress={() => setCatchUpDismissed(true)}>
              <Text style={styles.catchUpBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {messages.length === 0 && <Text style={styles.muted}>No messages yet.</Text>}

        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : undefined;
          const isUser = msg.sender_id === 1;
          const isAiPrivate = msg.role === 'ai_private';
          const isAiPublic = msg.role === 'ai_public';
          const isStakeholder = msg.role === 'stakeholder';
          const showDate = shouldShowDateSep(msg, prev);
          const isFirstInGroup = !prev || prev.sender_id !== msg.sender_id || showDate;
          const alertsHere = scopeAlerts.filter((a) => a.after_message_id === msg.id);

          return (
            <View key={msg.id ?? `m-${i}`}>
              {showDate && (
                <View style={styles.dateSep}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{formatMsgDate(msg.timestamp)}</Text>
                  <View style={styles.dateLine} />
                </View>
              )}

              {isAiPrivate ? (
                /* ── AI private: full-width amber card ── */
                <View style={styles.aiPrivateCard}>
                  <View style={styles.aiPrivateHeader}>
                    <Text style={styles.aiPrivateLock}>{'\u{1F512}'}</Text>
                    <Text style={styles.aiPrivateLabel}>Only you can see this</Text>
                  </View>
                  <Text style={styles.aiPrivateText}>{msg.text}</Text>
                </View>
              ) : (
                /* ── Regular bubble ── */
                <View
                  style={[
                    styles.bubbleRow,
                    isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
                    !isFirstInGroup && !isUser && { marginLeft: 38 },
                    !isFirstInGroup && { marginBottom: 4 },
                  ]}
                >
                  {/* Avatar (only first in group, non-user) */}
                  {!isUser && isFirstInGroup && (
                    <View
                      style={[
                        styles.senderAvatar,
                        isStakeholder && styles.avatarStakeholder,
                        isAiPublic && styles.avatarAi,
                      ]}
                    >
                      <Text style={styles.senderInitial}>
                        {isAiPublic ? 'AI' : (msg.sender_name ?? 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ maxWidth: '75%' }}>
                    {/* Sender name (only first in group, non-user) */}
                    {!isUser && isFirstInGroup && (
                      <Text
                        style={[
                          styles.senderName,
                          isStakeholder && { color: '#7c3aed' },
                          isAiPublic && { color: '#0d9488' },
                        ]}
                      >
                        {msg.sender_name ?? 'User'}
                      </Text>
                    )}

                    {/* Bubble */}
                    <View
                      style={[
                        styles.bubble,
                        isUser && styles.bubbleUser,
                        !isUser && !isAiPublic && styles.bubbleOther,
                        isAiPublic && styles.bubbleAiPublic,
                      ]}
                    >
                      <Text
                        style={[
                          isUser ? styles.bubbleTextUser : styles.bubbleTextOther,
                          isAiPublic && { color: '#134e4a' },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>

                    {/* Read receipt (user messages only) */}
                    {isUser && <ReadReceipt read={msg.read} status={msg.status} />}
                  </View>
                </View>
              )}

              {alertsHere.map((alert) => (
                <ScopeAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))}
            </View>
          );
        })}

        {orphanAlerts.map((alert) => (
          <ScopeAlert key={alert.id} alert={alert} onDismiss={dismissAlert} />
        ))}
      </ScrollView>

      {/* ── Input row ── */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn} hitSlop={8}>
          <View style={{ transform: [{ rotate: '-45deg' }] }}>
            <Text style={{ fontSize: 20, color: '#9aa0ae' }}>{'\u{1F4CE}'}</Text>
          </View>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={'Message\u2026'}
          placeholderTextColor="#9aa0ae"
          multiline
          numberOfLines={4}
          maxLength={2000}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Text style={styles.sendText}>{'\u2191'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Styles ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f6f8fb' },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  muted: { color: '#9aa0ae', fontSize: 13, textAlign: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e6ed',
    gap: 12,
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontWeight: '700', fontSize: 16, color: '#0f1623' },
  headerSub: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
  headerParticipant: { fontSize: 12, color: '#6b7280' },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '600', color: '#16a34a' },
  headerRight: { flexDirection: 'row', gap: 16, alignItems: 'center' },

  /* Three-dot menu */
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 60,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 210,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuItemText: { fontSize: 14, color: '#0f1623' },

  /* Catch-up banner */
  catchUp: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  catchUpTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  catchUpBullet: { fontSize: 12, color: '#1e3a5f', lineHeight: 20, marginLeft: 4 },
  catchUpBold: { fontWeight: '600' },
  catchUpBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#1d6ecd',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  catchUpBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* Scroll / list */
  scroll: { flex: 1 },
  list: { padding: 16, paddingBottom: 8 },

  /* Date separator */
  dateSep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#e2e6ed' },
  dateText: { fontSize: 11, fontWeight: '600', color: '#9aa0ae' },

  /* Bubble rows */
  bubbleRow: { marginBottom: 12 },
  bubbleRowRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  bubbleRowLeft: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8 },

  /* Avatars */
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  avatarStakeholder: {
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  avatarAi: {
    backgroundColor: '#0d9488',
  },
  senderInitial: { color: '#fff', fontWeight: '700', fontSize: 12 },
  senderName: { fontSize: 11, color: '#9aa0ae', marginBottom: 3 },

  /* Bubbles */
  bubble: { padding: 12, borderRadius: 14 },
  bubbleUser: {
    backgroundColor: '#1d6ecd',
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e6ed',
  },
  bubbleAiPublic: {
    backgroundColor: '#ccfbf1',
    borderTopLeftRadius: 4,
  },
  bubbleTextUser: { fontSize: 14, color: '#fff', lineHeight: 20 },
  bubbleTextOther: { fontSize: 14, color: '#0f1623', lineHeight: 20 },

  /* AI private card */
  aiPrivateCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  aiPrivateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiPrivateLock: { fontSize: 13 },
  aiPrivateLabel: { fontSize: 11, fontWeight: '600', color: '#92400e' },
  aiPrivateText: { fontSize: 13, color: '#78350f', lineHeight: 19 },

  /* Input row */
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e6ed',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  attachBtn: { paddingVertical: 8, paddingHorizontal: 2 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
    color: '#0f1623',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 18 },
});
