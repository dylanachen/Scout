import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { api } from '../api/client';

/**
 * Profile / conversational onboarding (post-login). Uses POST /onboarding/message.
 */
export default function OnboardingScreen() {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    setLines((l) => [...l, { role: 'user', text: t }]);
    setLoading(true);
    try {
      const { data } = await api.post('/onboarding/message', { message: t });
      const reply = (data as { reply?: string; message?: string })?.reply ?? (data as { message?: string })?.message ?? JSON.stringify(data);
      setLines((l) => [...l, { role: 'assistant', text: String(reply) }]);
    } catch {
      setLines((l) => [...l, { role: 'assistant', text: 'API error — is the backend running?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Profile onboarding</Text>
      <Text style={styles.muted}>Conversational intake · POST /onboarding/message</Text>
      <View style={{ marginTop: 16, gap: 10 }}>
        {lines.map((m, i) => (
          <View
            key={i}
            style={[
              styles.line,
              m.role === 'user' ? styles.lineUser : styles.lineBot,
            ]}
          >
            <Text style={m.role === 'user' ? styles.lineTextUser : styles.lineTextBot}>{m.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Your answer…"
          placeholderTextColor="#9aa0ae"
        />
        <TouchableOpacity style={styles.btn} onPress={send} disabled={loading}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 20, fontWeight: '700', color: '#0f1623' },
  muted: { fontSize: 13, color: '#9aa0ae', marginTop: 6 },
  line: { maxWidth: '90%', padding: 12, borderRadius: 12, marginBottom: 8 },
  lineUser: { alignSelf: 'flex-end', backgroundColor: '#1d6ecd' },
  lineBot: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6ed' },
  lineTextUser: { color: '#fff', fontSize: 14 },
  lineTextBot: { color: '#0f1623', fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  btn: { justifyContent: 'center', backgroundColor: '#1d6ecd', paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
