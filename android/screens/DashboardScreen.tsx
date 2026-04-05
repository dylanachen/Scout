import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../api/client';

export default function DashboardScreen() {
  const [count, setCount] = useState<number | null>(null);
  const [hint, setHint] = useState('');

  useEffect(() => {
    api
      .get('/projects')
      .then((r) => setCount((r.data as unknown[])?.length ?? 0))
      .catch(() => {
        setCount(0);
        setHint('API offline — start FastAPI on EXPO_PUBLIC_API_URL');
      });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Dashboard</Text>
      <Text style={styles.muted}>Team Pylovers · Angela (mobile)</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Active projects</Text>
        <Text style={styles.value}>{count === null ? '…' : String(count)}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>

      {__DEV__ ? (
        <View style={styles.devCard}>
          <Text style={styles.devTitle}>Dev · expo-constants</Text>
          <Text style={styles.devLine}>Slug: {Constants.expoConfig?.slug ?? '—'}</Text>
          <Text style={styles.devLine}>Version: {Constants.expoConfig?.version ?? '—'}</Text>
          <Text style={styles.devLine}>
            API: {process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000 (default)'}
          </Text>
          <Text style={styles.devLineMuted}>Open React Native dev menu → “FreelanceOS: Sign out” (same as header).</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20 },
  h1: { fontSize: 22, fontWeight: '700', color: '#0f1623', marginBottom: 6 },
  muted: { fontSize: 13, color: '#9aa0ae', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 18,
  },
  label: { fontSize: 11, fontWeight: '600', color: '#9aa0ae', textTransform: 'uppercase' },
  value: { fontSize: 22, fontWeight: '700', marginTop: 6, color: '#0f1623' },
  hint: { marginTop: 10, fontSize: 12, color: '#991b1b' },
  devCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0f1623',
    borderWidth: 1,
    borderColor: '#1d6ecd',
  },
  devTitle: { fontSize: 11, fontWeight: '700', color: '#7dd3fc', marginBottom: 8, textTransform: 'uppercase' },
  devLine: { fontSize: 11, color: '#e2e8f0', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), marginBottom: 4 },
  devLineMuted: { fontSize: 10, color: '#94a3b8', marginTop: 8, lineHeight: 15 },
});
