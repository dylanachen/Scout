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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';
import ScopeAlert, { type ScopeAlertPayload } from '../components/ScopeAlert';

type Msg = { id?: string; text?: string; sender_id?: number; sender_name?: string };

const DEMO_CHAT_SEED = (): Msg[] => [
  {
    id: 'demo-m1',
    text: 'Hey — can we add one more hero variant before launch?',
    sender_id: 2,
    sender_name: 'Jordan (Client)',
  },
  {
    id: 'demo-m2',
    text: 'Yes, happy to scope that. I’ll send a mini change order.',
    sender_id: 1,
    sender_name: 'Demo Freelancer',
  },
];

export default function ChatScreen() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [scopeAlerts, setScopeAlerts] = useState<ScopeAlertPayload[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [sendHint, setSendHint] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

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
        if (data.type === 'history' && Array.isArray(data.payload)) {
          setMessages(data.payload);
          return;
        }
        if (data.type === 'message' && data.payload) {
          setMessages((m) => [...m, data.payload]);
          return;
        }
        if (data.type === 'scope_alert' && data.payload) {
          const p = data.payload as ScopeAlertPayload;
          const id = p.id ?? `scope_${Date.now()}`;
          setScopeAlerts((prev) => [{ ...p, id }, ...prev]);
        }
      } catch {
        /* ignore */
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setScopeAlerts([]);
      setConnected(false);
      setSendHint('');
      return;
    }
    if (isDemoMode()) {
      setMessages(DEMO_CHAT_SEED());
      setConnected(true);
      setSendHint('');
      return;
    }
    setConnected(false);
    setMessages([]);
    connect();
    return () => wsRef.current?.close();
  }, [projectId, connect]);

  useEffect(() => {
    if (connected) setSendHint('');
  }, [connected]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, scopeAlerts]);

  const dismissAlert = (id: string) => {
    setScopeAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const send = () => {
    const t = input.trim();
    if (!t) return;
    if (isDemoMode()) {
      setSendHint('');
      setMessages((m) => [
        ...m,
        {
          id: `demo-local-${Date.now()}`,
          text: t,
          sender_id: 1,
          sender_name: 'Demo Freelancer',
        },
      ]);
      setInput('');
      return;
    }
    if (!connected) {
      setSendHint('Not connected. Start the API or set EXPO_PUBLIC_DEMO_MODE=true in android/.env and restart Expo.');
      return;
    }
    setSendHint('');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text: t }));
    }
    setInput('');
  };

  const orphanAlerts = scopeAlerts.filter((a) => !a.after_message_id);

  if (!projectId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No projects loaded.</Text>
        <Text style={[styles.muted, { marginTop: 10 }]}>
          {isDemoMode()
            ? 'Try signing in again (demo mode should return sample projects).'
            : 'Start FastAPI or enable EXPO_PUBLIC_DEMO_MODE=true in android/.env and restart Expo.'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
      <View style={styles.bar}>
        <Text style={styles.barTitle}>Project chat</Text>
        <Text style={styles.mutedSmall}>
          {isDemoMode() ? 'Demo (local)' : connected ? 'Connected' : 'Offline — start API or demo mode'}
        </Text>
        <Text style={styles.hint}>
          {isDemoMode() ? 'Demo chat (local — no WebSocket).' : 'Scope Guardian alerts are private to you.'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.list}>
        {messages.length === 0 && <Text style={styles.muted}>No messages yet.</Text>}
        {messages.map((msg, i) => {
          const alertsHere = scopeAlerts.filter((a) => a.after_message_id === msg.id);
          return (
            <View key={msg.id ?? `m-${i}`}>
              <View style={styles.bubbleWrap}>
                <Text style={styles.bubbleMeta}>{msg.sender_name ?? 'User'}</Text>
                <Text style={styles.bubble}>{msg.text}</Text>
              </View>
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor="#9aa0ae"
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.send, !input.trim() && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
      {sendHint ? <Text style={styles.sendHint}>{sendHint}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f6f8fb' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  bar: { padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e6ed' },
  barTitle: { fontWeight: '700', fontSize: 15, color: '#0f1623' },
  muted: { color: '#9aa0ae', fontSize: 13 },
  mutedSmall: { color: '#9aa0ae', fontSize: 12, marginTop: 4 },
  hint: { color: '#9aa0ae', fontSize: 10, marginTop: 4 },
  scroll: { flex: 1 },
  list: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 12 },
  bubbleMeta: { fontSize: 11, color: '#9aa0ae', marginBottom: 4 },
  bubble: {
    fontSize: 14,
    color: '#0f1623',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ed',
  },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e6ed' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  send: { justifyContent: 'center', backgroundColor: '#1d6ecd', paddingHorizontal: 16, borderRadius: 10 },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sendHint: { fontSize: 12, color: '#dc2626', paddingHorizontal: 12, paddingBottom: 10, lineHeight: 18 },
});
