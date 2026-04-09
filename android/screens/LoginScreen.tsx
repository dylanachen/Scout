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
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api/client';
import {
  DEMO_SESSION_KEY,
  DEMO_CREDENTIALS_PASSWORD,
  DEMO_CLIENT_USER,
  DEMO_FREELANCER_USER,
  isDemoMode,
} from '../api/demoAdapter';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

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
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setBanner('');
    setLoading(true);
    try {
      const e = email.trim().toLowerCase();
      if (
        password === DEMO_CREDENTIALS_PASSWORD &&
        (e === DEMO_FREELANCER_USER || e === DEMO_CLIENT_USER)
      ) {
        await AsyncStorage.setItem(DEMO_SESSION_KEY, '1');
      } else {
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      }
      const res = await authApi.login(email.trim(), password);
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('fos_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('fos_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      setBanner(formatAuthError(err) ?? 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const exploreFreelancer = async () => {
    setBanner('');
    setLoading(true);
    try {
      await AsyncStorage.setItem(DEMO_SESSION_KEY, '1');
      const res = await authApi.login(DEMO_FREELANCER_USER, DEMO_CREDENTIALS_PASSWORD);
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('fos_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('fos_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      setBanner(formatAuthError(err) ?? 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const exploreClient = async () => {
    setBanner('');
    setLoading(true);
    try {
      await AsyncStorage.setItem(DEMO_SESSION_KEY, '1');
      const res = await authApi.login(DEMO_CLIENT_USER, DEMO_CREDENTIALS_PASSWORD);
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('fos_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('fos_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      setBanner(formatAuthError(err) ?? 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.card}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>FO</Text>
          </View>
          <Text style={styles.brand}>FreelanceOS</Text>
        </View>
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            <Text style={styles.hintBold}>Quick demo</Text> (password <Text style={styles.hintBold}>test</Text>): freelancer{' '}
            <Text style={styles.hintBold}>freelancer</Text> · client <Text style={styles.hintBold}>client</Text>. Local mock data.
          </Text>
        </View>
        {demo ? (
          <View style={styles.demoBox}>
            <Text style={styles.demoText}>
              <Text style={styles.demoBold}>Demo mode</Text> — no backend. Use any email/password, or:
            </Text>
            <View style={styles.demoBtnRow}>
              <TouchableOpacity
                style={[styles.demoBtn, styles.demoBtnHalf]}
                onPress={exploreFreelancer}
                disabled={loading}
              >
                <Text style={styles.demoBtnText}>Freelancer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.demoBtn, styles.demoBtnHalf]} onPress={exploreClient} disabled={loading}>
                <Text style={styles.demoBtnText}>Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to your workspace</Text>

        {banner ? (
          <View style={styles.bannerWrap}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email or username</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="default"
          value={email}
          onChangeText={setEmail}
          placeholder="freelancer, client, or email"
          placeholderTextColor="#9aa0ae"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.pwRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9aa0ae"
          />
          <Pressable onPress={() => setShowPw((s) => !s)} style={styles.showBtn}>
            <Text style={styles.showBtnText}>{showPw ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        <View style={styles.forgotRow}>
          <Text style={styles.forgotSpacer} />
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={8}>
            <Text style={styles.switchLink}>Sign up</Text>
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
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  brand: { fontWeight: '700', fontSize: 17, color: '#0f1623' },
  hintBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  hintText: { fontSize: 12, lineHeight: 18, color: '#14532d' },
  hintBold: { fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '600', color: '#0f1623', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9aa0ae', marginBottom: 20 },
  bannerWrap: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bannerText: { color: '#991b1b', fontSize: 13 },
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
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  showBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  showBtnText: { fontSize: 12, color: '#9aa0ae', fontWeight: '600' },
  forgotRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  forgotSpacer: { flex: 1 },
  forgotLink: { fontSize: 13, color: '#1d6ecd', fontWeight: '600' },
  btn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
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
  demoBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  demoBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  demoBtnHalf: { flex: 1 },
  demoBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
