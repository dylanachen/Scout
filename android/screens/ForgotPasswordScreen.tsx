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
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api/client';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

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

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const blur = () => {
    setTouched(true);
    const t = email.trim();
    setEmailError(!t ? 'Enter your email.' : !validEmail(t) ? 'Enter a valid email.' : '');
  };

  const submit = async () => {
    setSubmitError('');
    blur();
    const t = email.trim();
    const err = !t ? 'Enter your email.' : !validEmail(t) ? 'Enter a valid email.' : '';
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      await authApi.forgotPassword(t);
      setSuccess(true);
    } catch (e) {
      setSubmitError(formatAuthError(e) ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backRow} hitSlop={12}>
            <Text style={styles.backText}>← Back to log in</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.brand}>Scout</Text>
          </View>

          {success ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={styles.check}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={styles.subCenter}>
                If an account exists for that email, we&apos;ve sent reset instructions.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>Return to log in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.titleForm}>Reset your password</Text>
              <Text style={styles.sub}>We&apos;ll send a reset link to your email.</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, touched && emailError ? styles.inputErr : null]}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onBlur={blur}
                placeholder="you@example.com"
                placeholderTextColor="#9aa0ae"
              />
              {touched && emailError ? <Text style={styles.fieldErr}>{emailError}</Text> : null}
              {submitError ? <Text style={styles.fieldErr}>{submitError}</Text> : null}

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
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
  backRow: { marginBottom: 16 },
  backText: { fontSize: 13, color: '#4a5568', fontWeight: '600' },
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
  title: { fontSize: 22, fontWeight: '600', color: '#0f1623', marginBottom: 8, textAlign: 'center' },
  titleForm: { fontSize: 22, fontWeight: '600', color: '#0f1623', marginBottom: 8 },
  sub: { fontSize: 14, color: '#9aa0ae', marginBottom: 20, lineHeight: 20 },
  subCenter: { fontSize: 14, color: '#9aa0ae', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(22,163,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkMark: { fontSize: 28, color: '#15803d' },
  label: { fontSize: 12, fontWeight: '500', color: '#4a5568', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 8,
    color: '#0f1623',
  },
  inputErr: { borderColor: '#dc2626' },
  fieldErr: { color: '#dc2626', fontSize: 12, marginBottom: 10 },
  btn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  linkBtn: { marginTop: 20 },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#1d6ecd', textAlign: 'center' },
});
