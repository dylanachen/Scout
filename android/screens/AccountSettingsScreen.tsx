import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi, type MeUser } from '../api/client';
import { useAuth } from '../context/AuthContext';

type StackParamList = {
  Tabs: undefined;
  AccountSettings: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<StackParamList, 'AccountSettings'>;
  onSignedOut: () => Promise<void>;
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AccountSettingsScreen({ navigation, onSignedOut }: Props) {
  const { signOut } = useAuth();

  const [user, setUser] = useState<MeUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const baseline = useRef({ name: '', email: '', avatar: null as string | null });

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [expandPw, setExpandPw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingMe, setLoadingMe] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const load = useCallback(async () => {
    setLoadingMe(true);
    try {
      const { data } = await authApi.me();
      setUser(data);
      const n = data.name ?? '';
      const e = data.email ?? '';
      const a = data.avatar_url ?? null;
      setName(n);
      setEmail(e);
      setAvatarUri(a);
      baseline.current = { name: n, email: e, avatar: a };
    } catch {
      setUser(null);
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDeleteSheet = () => {
    setDeleteOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };

  const closeDeleteSheet = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => {
      setDeleteOpen(false);
    });
  };

  const dirty =
    name.trim() !== baseline.current.name.trim() ||
    email.trim() !== baseline.current.email.trim() ||
    avatarUri !== baseline.current.avatar;

  const blurName = () => {
    setNameTouched(true);
    setNameError(!name.trim() ? 'Enter your name.' : '');
  };
  const blurEmail = () => {
    setEmailTouched(true);
    setEmailError(!email.trim() ? 'Enter your email.' : !validEmail(email) ? 'Enter a valid email.' : '');
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.base64) setAvatarUri(`data:image/jpeg;base64,${a.base64}`);
    else if (a.uri) setAvatarUri(a.uri);
  };

  const saveProfile = async () => {
    setSaveError('');
    blurName();
    blurEmail();
    const ne = !name.trim() ? 'Enter your name.' : '';
    const ee = !email.trim() ? 'Enter your email.' : !validEmail(email) ? 'Enter a valid email.' : '';
    setNameError(ne);
    setEmailError(ee);
    if (ne || ee) return;

    setSaveLoading(true);
    try {
      const { data } = await authApi.patchMe({ name: name.trim(), email: email.trim(), avatar_url: avatarUri });
      setUser(data);
      baseline.current = { name: name.trim(), email: email.trim(), avatar: avatarUri };
    } catch (err) {
      setSaveError(formatAuthError(err) ?? 'Could not save changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  const submitPw = async () => {
    setPwError('');
    setPwOk('');
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confPw) { setPwError('New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword({ current_password: curPw, new_password: newPw });
      setCurPw(''); setNewPw(''); setConfPw('');
      setPwOk('Password updated.');
    } catch (err) {
      setPwError(formatAuthError(err) ?? 'Could not update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await authApi.deleteMe();
      await AsyncStorage.multiRemove(['scout_token', 'scout_user_id']);
      closeDeleteSheet();
      await onSignedOut();
    } catch {
      setDeleteLoading(false);
    }
  };

  if (loadingMe) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1d6ecd" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load account.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Account Settings</Text>
        <Text style={styles.muted}>Manage your profile and security.</Text>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                <Text style={{ fontSize: 32, color: '#9aa0ae' }}>{'\u25CE'}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{'\u270E'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={[styles.input, nameTouched && nameError ? styles.inputErr : null]}
          value={name}
          onChangeText={setName}
          onBlur={blurName}
        />
        {nameTouched && nameError ? <Text style={styles.fieldErr}>{nameError}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailTouched && emailError ? styles.inputErr : null]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onBlur={blurEmail}
        />
        {emailTouched && emailError ? <Text style={styles.fieldErr}>{emailError}</Text> : null}

        <View style={styles.pwSection}>
          <TouchableOpacity style={styles.pwHeader} onPress={() => setExpandPw((x) => !x)} activeOpacity={0.85}>
            <Text style={styles.pwHeaderText}>Change password</Text>
            <Text style={styles.chev}>{expandPw ? '\u25BE' : '\u25B8'}</Text>
          </TouchableOpacity>
          {expandPw ? (
            <View style={styles.pwBody}>
              <Text style={styles.label}>Current password</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 12 }]} secureTextEntry={!show1} value={curPw} onChangeText={setCurPw} />
                <Pressable onPress={() => setShow1((s) => !s)} style={styles.showBtn}>
                  <Text style={styles.showTxt}>{show1 ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>New password</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 12 }]} secureTextEntry={!show2} value={newPw} onChangeText={setNewPw} />
                <Pressable onPress={() => setShow2((s) => !s)} style={styles.showBtn}>
                  <Text style={styles.showTxt}>{show2 ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 12 }]} secureTextEntry={!show3} value={confPw} onChangeText={setConfPw} />
                <Pressable onPress={() => setShow3((s) => !s)} style={styles.showBtn}>
                  <Text style={styles.showTxt}>{show3 ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              {pwError ? <Text style={styles.fieldErr}>{pwError}</Text> : null}
              {pwOk ? <Text style={styles.ok}>{pwOk}</Text> : null}
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void submitPw()} disabled={pwLoading}>
                <Text style={styles.secondaryBtnText}>{pwLoading ? 'Updating\u2026' : 'Update password'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {saveError ? <Text style={styles.fieldErr}>{saveError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!dirty || saveLoading) && styles.primaryBtnOff]}
          onPress={saveProfile}
          disabled={!dirty || saveLoading}
        >
          {saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        {/* Log Out button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => void signOut()}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteLink} onPress={openDeleteSheet}>
          <Text style={styles.deleteLinkText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom-sheet delete confirmation */}
      <Modal visible={deleteOpen} transparent animationType="none">
        <Pressable style={styles.sheetBackdrop} onPress={closeDeleteSheet}>
          <Animated.View
            style={[styles.sheetCard, { transform: [{ translateY: slideAnim }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Delete your account?</Text>
            <Text style={styles.sheetBody}>
              This will permanently delete your account and all project data. This cannot be undone.
            </Text>
            <TouchableOpacity style={styles.sheetDelBtn} onPress={confirmDelete} disabled={deleteLoading}>
              <Text style={styles.sheetDelText}>{deleteLoading ? 'Deleting\u2026' : 'Yes, delete my account'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeDeleteSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '700', color: '#0f1623', marginBottom: 6 },
  muted: { fontSize: 14, color: '#9aa0ae', marginBottom: 8 },
  link: { marginTop: 12, color: '#1d6ecd', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 9,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
    color: '#0f1623',
    backgroundColor: '#fff',
  },
  inputErr: { borderColor: '#dc2626' },
  fieldErr: { color: '#dc2626', fontSize: 12, marginBottom: 10 },
  ok: { color: '#15803d', fontSize: 12, marginBottom: 10 },
  avatarWrap: { position: 'relative' },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#e2e6ed',
    backgroundColor: '#e8ecf2',
  },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pwSection: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f6f8fb',
  },
  pwHeaderText: { fontSize: 14, fontWeight: '700', color: '#0f1623' },
  chev: { color: '#9aa0ae', fontSize: 14 },
  pwBody: { padding: 16, borderTopWidth: 1, borderTopColor: '#e2e6ed' },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showBtn: { padding: 8 },
  showTxt: { fontSize: 12, color: '#9aa0ae', fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryBtnText: { fontWeight: '600', color: '#0f1623' },
  primaryBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnOff: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  logoutBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutBtnText: { fontWeight: '600', color: '#0f1623', fontSize: 15 },

  deleteLink: { marginTop: 20, alignItems: 'center' },
  deleteLinkText: { color: '#dc2626', fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,22,35,0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e6ed',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#0f1623', marginBottom: 10 },
  sheetBody: { fontSize: 14, color: '#4a5568', lineHeight: 21, marginBottom: 24 },
  sheetDelBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetDelText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sheetCancelBtn: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancelText: { fontWeight: '600', color: '#0f1623', fontSize: 15 },
});
