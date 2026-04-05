import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { authApi } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

type Props = { onAuthed: () => void };

function formatAuthError(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const d = err.response?.data as { detail?: string | { msg?: string }[] };
  const detail = d?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((x) => x.msg ?? JSON.stringify(x)).join(' ');
  return null;
}

export default function LoginScreen({ onAuthed }: Props) {
  const demo = isDemoMode();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signup';

  const submit = async () => {
    setError('');
    if (isSignUp && password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setLoading(true);
    try {
      const e = email.trim();
      if (isSignUp) await authApi.register(e, password);
      const res = await authApi.login(e, password);
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('fos_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('fos_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      setError(
        formatAuthError(err) ?? (isSignUp ? 'Could not create account.' : 'Invalid email or password.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>FO</Text>
          </View>
          <Text style={styles.brand}>FreelanceOS</Text>
        </View>
        {demo ? (
          <View style={styles.demoBox}>
            <Text style={styles.demoText}>
              <Text style={styles.demoBold}>Demo mode</Text> — no backend. Use any email/password, or:
            </Text>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={async () => {
                setError('');
                setLoading(true);
                try {
                  const res = await authApi.login('demo@freelanceos.local', 'demo');
                  const tok = res.data.access_token ?? res.data.token;
                  if (!tok) throw new Error('No token');
                  await AsyncStorage.setItem('fos_token', tok);
                  const me = await authApi.me();
                  await AsyncStorage.setItem('fos_user_id', String(me.data.id));
                  onAuthed();
                } catch (err) {
                  setError(formatAuthError(err) ?? 'Demo login failed.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.demoBtnText}>Explore signed-in UI</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.sub}>{isSignUp ? 'Sign up, then continue to your workspace' : 'Sign in to your workspace'}</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9aa0ae"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9aa0ae"
        />
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{isSignUp ? 'Already have an account? ' : 'New here? '}</Text>
          <TouchableOpacity
            onPress={() => {
              setMode(isSignUp ? 'signin' : 'signup');
              setError('');
            }}
            hitSlop={8}
          >
            <Text style={styles.switchLink}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f6f8fb', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 28,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  brand: { fontWeight: '700', fontSize: 16, color: '#0f1623' },
  title: { fontSize: 20, fontWeight: '600', color: '#0f1623', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9aa0ae', marginBottom: 20 },
  err: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '500', color: '#4a5568', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 14,
    color: '#0f1623',
  },
  btn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 13, color: '#9aa0ae' },
  switchLink: { fontSize: 13, color: '#1d6ecd', fontWeight: '600' },
  demoBox: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  demoText: { fontSize: 12, lineHeight: 18, color: '#1e3a5f' },
  demoBold: { fontWeight: '700' },
  demoBtn: {
    marginTop: 10,
    backgroundColor: '#1d6ecd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  demoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
