import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

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

function validEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function getPasswordStrength(pw: string) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#dc2626', pct: 33 };
  if (score <= 3) return { label: 'Fair', color: '#ca8a04', pct: 66 };
  return { label: 'Strong', color: '#16a34a', pct: 100 };
}

export default function SignUpScreen({ onAuthed }: Props) {
  const demo = isDemoMode();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [role, setRole] = useState<'freelancer' | 'client' | ''>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validate = (field?: string) => {
    const next = { ...errors };
    if (!field || field === 'fullName') {
      next.fullName = !fullName.trim() ? 'Enter your full name.' : '';
    }
    if (!field || field === 'email') {
      next.email = !email.trim() ? 'Enter your email.' : !validEmail(email) ? 'Enter a valid email.' : '';
    }
    if (!field || field === 'password') {
      next.password = password.length < 8 ? 'Use at least 8 characters.' : '';
    }
    if (!field || field === 'confirm') {
      next.confirm = confirm !== password ? 'Passwords do not match.' : '';
    }
    setErrors(next);
    return next;
  };

  const blur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
    validate(field);
  };

  const allFieldsFilled =
    fullName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    confirm === password &&
    role &&
    termsAccepted;

  const explore = async () => {
    setFormError('');
    setLoading(true);
    try {
      const res = await authApi.login('demo@scout.local', 'demo');
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('scout_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('scout_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      setFormError(formatAuthError(err) ?? 'Could not continue.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setFormError('');
    setTouched({ fullName: true, email: true, password: true, confirm: true });
    const v = validate();
    if (v.fullName || v.email || v.password || v.confirm || !role || !termsAccepted) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
      });
      const res = await authApi.login(email.trim(), password);
      const tok = res.data.access_token ?? res.data.token;
      if (!tok) throw new Error('No token');
      await AsyncStorage.setItem('scout_token', tok);
      const me = await authApi.me();
      await AsyncStorage.setItem('scout_user_id', String(me.data.id));
      onAuthed();
    } catch (err) {
      setFormError(formatAuthError(err) ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () =>
    Alert.alert('Terms of Service', 'View the Scout Terms of Service at scout.com/terms');
  const openPrivacy = () =>
    Alert.alert('Privacy Policy', 'View the Scout Privacy Policy at scout.com/privacy');

  const strength = getPasswordStrength(password);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.brand}>Scout</Text>
          </View>
          {demo ? (
            <View style={styles.demoBox}>
              <Text style={styles.demoText}>
                <Text style={styles.demoBold}>Demo mode</Text> — no backend. Use any email/password, or:
              </Text>
              <TouchableOpacity style={styles.demoBtn} onPress={explore} disabled={loading}>
                <Text style={styles.demoBtnText}>Explore signed-in UI</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>Join 30 million+ freelancers building smarter client relationships</Text>
          {formError ? <Text style={styles.err}>{formError}</Text> : null}

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={[styles.input, touched.fullName && errors.fullName ? styles.inputErr : null]}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => blur('fullName')}
            placeholder="Your full name"
            placeholderTextColor="#9aa0ae"
          />
          {touched.fullName && errors.fullName ? <Text style={styles.fieldErr}>{errors.fullName}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, touched.email && errors.email ? styles.inputErr : null]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onBlur={() => blur('email')}
            placeholder="you@email.com"
            placeholderTextColor="#9aa0ae"
          />
          {touched.email && errors.email ? <Text style={styles.fieldErr}>{errors.email}</Text> : null}

          <Text style={styles.label}>Password</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }, touched.password && errors.password ? styles.inputErr : null]}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (touched.confirm) setErrors((e) => ({ ...e, confirm: t !== confirm ? 'Passwords do not match.' : '' }));
              }}
              onBlur={() => blur('password')}
              placeholder="Create a password"
              placeholderTextColor="#9aa0ae"
            />
            <Pressable onPress={() => setShowPw((s) => !s)} style={styles.showBtn}>
              <Text style={styles.showBtnText}>{showPw ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {touched.password && errors.password ? <Text style={styles.fieldErr}>{errors.password}</Text> : null}

          {password.length > 0 && strength && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }, touched.confirm && errors.confirm ? styles.inputErr : null]}
              secureTextEntry={!showPw2}
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                if (touched.confirm) setErrors((e) => ({ ...e, confirm: t !== password ? 'Passwords do not match.' : '' }));
              }}
              onBlur={() => blur('confirm')}
              placeholder="Confirm your password"
              placeholderTextColor="#9aa0ae"
            />
            <Pressable onPress={() => setShowPw2((s) => !s)} style={styles.showBtn}>
              <Text style={styles.showBtnText}>{showPw2 ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {touched.confirm && errors.confirm ? <Text style={styles.fieldErr}>{errors.confirm}</Text> : null}

          <Text style={[styles.label, { marginTop: 6 }]}>Choose your role</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'freelancer' && styles.roleCardOn]}
              onPress={() => setRole('freelancer')}
              activeOpacity={0.85}
            >
              {role === 'freelancer' && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>{'\u2713'}</Text>
                </View>
              )}
              <Text style={styles.roleEmoji}>{'\u{1F4BC}'}</Text>
              <Text style={styles.roleTitle}>I'm a Freelancer</Text>
              <Text style={styles.roleDesc}>I find and work with clients</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleCard, role === 'client' && styles.roleCardOn]}
              onPress={() => setRole('client')}
              activeOpacity={0.85}
            >
              {role === 'client' && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>{'\u2713'}</Text>
                </View>
              )}
              <Text style={styles.roleEmoji}>{'\u{1F3E2}'}</Text>
              <Text style={styles.roleTitle}>I'm a Client</Text>
              <Text style={styles.roleDesc}>I hire freelancers for projects</Text>
            </TouchableOpacity>
          </View>

          {/* Terms — checkbox + separately tappable links */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setTermsAccepted((v) => !v)}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
                {termsAccepted && <Text style={styles.checkboxMark}>{'\u2713'}</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={openTerms}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={openPrivacy}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, (!allFieldsFilled || loading) && styles.btnDisabled]}
            onPress={submit}
            disabled={loading || !allFieldsFilled}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.btnText}>Creating your account…</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={8}>
              <Text style={styles.switchLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f6f8fb' },
  scroll: { paddingVertical: 24, paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 24,
    maxWidth: 420,
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
  title: { fontSize: 22, fontWeight: '600', color: '#0f1623', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9aa0ae', marginBottom: 16, lineHeight: 19 },
  err: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  fieldErr: { color: '#dc2626', fontSize: 12, marginTop: -10, marginBottom: 10 },
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
  inputErr: { borderColor: '#dc2626' },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  showBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  showBtnText: { fontSize: 12, color: '#9aa0ae', fontWeight: '600' },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -8, marginBottom: 12 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e6ed', overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '500' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
    position: 'relative',
  },
  roleCardOn: { borderColor: '#1d6ecd', backgroundColor: 'rgba(29,110,205,0.06)' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  roleEmoji: { fontSize: 22, marginBottom: 6, textAlign: 'center' },
  roleTitle: { fontWeight: '700', fontSize: 14, color: '#0f1623', marginBottom: 4, textAlign: 'center' },
  roleDesc: { fontSize: 11, color: '#9aa0ae', lineHeight: 16, textAlign: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#e2e6ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { borderColor: '#1d6ecd', backgroundColor: '#1d6ecd' },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 13, color: '#4a5568', lineHeight: 19 },
  termsLink: { color: '#1d6ecd', fontWeight: '600', textDecorationLine: 'underline' },
  btn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#a8c4e0' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 },
  switchText: { fontSize: 13, color: '#9aa0ae' },
  switchLink: { fontSize: 13, color: '#1d6ecd', fontWeight: '600' },
  demoBox: {
    marginBottom: 16,
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
