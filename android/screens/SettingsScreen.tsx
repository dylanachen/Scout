import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { id: 'notifications', labelKey: 'settingsPage.sections.notifications.label', icon: 'N', iconBg: '#dbeafe', iconColor: '#1d6ecd', descriptionKey: 'settingsPage.sections.notifications.description' },
  { id: 'scope-guardian', labelKey: 'settingsPage.sections.scopeGuardian.label', icon: '!', iconBg: '#fef3c7', iconColor: '#d97706', descriptionKey: 'settingsPage.sections.scopeGuardian.description' },
  { id: 'rates-pricing', labelKey: 'settingsPage.sections.ratesPricing.label', icon: '$', iconBg: '#dcfce7', iconColor: '#16a34a', descriptionKey: 'settingsPage.sections.ratesPricing.description' },
  { id: 'communication', labelKey: 'settingsPage.sections.communication.label', icon: 'C', iconBg: '#f3e8ff', iconColor: '#7c3aed', descriptionKey: 'settingsPage.sections.communication.description' },
  { id: 'account', labelKey: 'settingsPage.sections.account.label', icon: 'A', iconBg: '#fce7f3', iconColor: '#db2777', descriptionKey: 'settingsPage.sections.account.description' },
];

const NOTIFICATION_TYPES = [
  { key: 'messages', labelKey: 'settingsPage.notificationTypes.messages' },
  { key: 'scopeFlags', labelKey: 'settingsPage.notificationTypes.scopeFlags' },
  { key: 'invoices', labelKey: 'settingsPage.notificationTypes.invoices' },
  { key: 'meetings', labelKey: 'settingsPage.notificationTypes.meetings' },
  { key: 'milestones', labelKey: 'settingsPage.notificationTypes.milestones' },
  { key: 'timeAlerts', labelKey: 'settingsPage.notificationTypes.timeAlerts' },
];

const SCOPE_LEVELS = [
  {
    key: 'relaxed',
    labelKey: 'settingsPage.scopeLevels.relaxed.label',
    icon: '\uD83D\uDEE1\uFE0F',
    descKey: 'settingsPage.scopeLevels.relaxed.description',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    key: 'balanced',
    labelKey: 'settingsPage.scopeLevels.balanced.label',
    icon: '\uD83D\uDEE1\uFE0F',
    descKey: 'settingsPage.scopeLevels.balanced.description',
    color: '#ca8a04',
    bg: '#fefce8',
  },
  {
    key: 'strict',
    labelKey: 'settingsPage.scopeLevels.strict.label',
    icon: '\uD83D\uDEE1\uFE0F',
    descKey: 'settingsPage.scopeLevels.strict.description',
    color: '#dc2626',
    bg: '#fef2f2',
  },
];

const RATE_TYPES = [
  { key: 'hourly', labelKey: 'settingsPage.rateTypes.hourly' },
  { key: 'perProject', labelKey: 'settingsPage.rateTypes.perProject' },
  { key: 'retainer', labelKey: 'settingsPage.rateTypes.retainer' },
];

const PAYMENT_TERMS = [
  { key: 'net15', labelKey: 'settingsPage.paymentTerms.net15' },
  { key: 'net30', labelKey: 'settingsPage.paymentTerms.net30' },
  { key: 'net45', labelKey: 'settingsPage.paymentTerms.net45' },
  { key: 'upon', labelKey: 'settingsPage.paymentTerms.uponCompletion' },
];

const RESPONSE_TIMES = [
  { key: 'withinHours', labelKey: 'settingsPage.responseTimes.withinHours', color: '#16a34a' },
  { key: 'sameDay', labelKey: 'settingsPage.responseTimes.sameDay', color: '#ca8a04' },
  { key: 'within48h', labelKey: 'settingsPage.responseTimes.within48h', color: '#6366f1' },
];

const MEETING_STYLES = [
  { key: 'video', labelKey: 'settingsPage.meetingStyles.videoCalls', color: '#1d6ecd' },
  { key: 'audio', labelKey: 'settingsPage.meetingStyles.audioOnly', color: '#16a34a' },
  { key: 'written', labelKey: 'settingsPage.meetingStyles.writtenOnly', color: '#7c3aed' },
];

const FEEDBACK_STYLES = [
  { key: 'direct', labelKey: 'settingsPage.feedbackStyles.direct', color: '#dc2626' },
  { key: 'diplomatic', labelKey: 'settingsPage.feedbackStyles.diplomatic', color: '#1d6ecd' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'user@scout.com';
  const userInitial = userName.charAt(0).toUpperCase();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({
    messages: true,
    scopeFlags: true,
    invoices: true,
    meetings: true,
    milestones: false,
    timeAlerts: true,
  });
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>({
    messages: false,
    scopeFlags: false,
    invoices: true,
    meetings: false,
    milestones: false,
    timeAlerts: false,
  });

  const [scopeLevel, setScopeLevel] = useState('balanced');

  const [hourlyRate, setHourlyRate] = useState('75');
  const [rateType, setRateType] = useState('hourly');
  const [taxPercent, setTaxPercent] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('net30');
  const [ratesDirty, setRatesDirty] = useState(false);

  const [responseTime, setResponseTime] = useState('sameDay');
  const [meetingStyle, setMeetingStyle] = useState('video');
  const [feedbackStyle, setFeedbackStyle] = useState('direct');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('scout_notification_preferences');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.notifToggles) setNotifToggles(parsed.notifToggles);
          if (parsed?.emailToggles) setEmailToggles(parsed.emailToggles);
        } catch {
          /* ignore bad data */
        }
      }
      const bio = await AsyncStorage.getItem('scout_biometric_enabled');
      setBiometricEnabled(bio === '1');
    })();
  }, []);

  const handleRowPress = (id: string) => {
    if (id === 'account') {
      navigation.navigate('AccountSettings');
      return;
    }
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const toggleNotif = (key: string) =>
    setNotifToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem('scout_notification_preferences', JSON.stringify({ notifToggles: next, emailToggles }));
      return next;
    });

  const toggleEmail = (key: string) =>
    setEmailToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem('scout_notification_preferences', JSON.stringify({ notifToggles, emailToggles: next }));
      return next;
    });

  const requestRuntimePermissions = async () => {
    if (Platform.OS !== 'android') return;
    const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];
    if (Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await PermissionsAndroid.requestMultiple(permissions);
    Alert.alert(t('settingsPage.permissionsUpdated'), t('settingsPage.permissionsRequested'));
  };

  const setRateField = (field: string, value: string) => {
    setRatesDirty(true);
    if (field === 'hourlyRate') setHourlyRate(value);
    else if (field === 'rateType') setRateType(value);
    else if (field === 'taxPercent') setTaxPercent(value);
    else if (field === 'paymentTerms') setPaymentTerms(value);
  };

  const handleSaveRates = () => {
    setRatesDirty(false);
    Alert.alert(t('settingsPage.saved'), t('settingsPage.ratesSaved'));
  };

  /* ── Section renderers ── */

  const renderNotifications = () => (
    <View style={styles.panel}>
      {NOTIFICATION_TYPES.map((nt) => (
        <View key={nt.key} style={styles.notifItem}>
          <View style={styles.notifRow}>
            <Text style={styles.notifLabel}>{t(nt.labelKey)}</Text>
            <Switch
              value={notifToggles[nt.key]}
              onValueChange={() => toggleNotif(nt.key)}
              trackColor={{ false: '#e2e6ed', true: '#93c5fd' }}
              thumbColor={notifToggles[nt.key] ? '#1d6ecd' : '#f4f4f5'}
            />
          </View>
          {notifToggles[nt.key] && (
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>{t('settingsPage.alsoNotifyEmail')}</Text>
              <Switch
                value={emailToggles[nt.key]}
                onValueChange={() => toggleEmail(nt.key)}
                trackColor={{ false: '#e2e6ed', true: '#93c5fd' }}
                thumbColor={emailToggles[nt.key] ? '#1d6ecd' : '#f4f4f5'}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderScopeGuardian = () => (
    <View style={styles.panel}>
      {SCOPE_LEVELS.map((level) => {
        const active = scopeLevel === level.key;
        return (
          <TouchableOpacity
            key={level.key}
            activeOpacity={0.7}
            onPress={() => setScopeLevel(level.key)}
            style={[
              styles.scopeCard,
              {
                borderColor: active ? level.color : '#e2e6ed',
                borderWidth: active ? 2 : 1,
                backgroundColor: active ? level.bg : '#fff',
              },
            ]}
          >
            <View style={styles.scopeHeader}>
              <Text style={styles.scopeIcon}>{level.icon}</Text>
              <Text style={[styles.scopeLabel, { color: level.color }]}>
                {t(level.labelKey)}
              </Text>
              {active && (
                <Text style={[styles.scopeCheck, { color: level.color }]}>
                  {'\u2713'}
                </Text>
              )}
            </View>
            <Text style={styles.scopeDesc}>{t(level.descKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderRatesPricing = () => (
    <View style={styles.panel}>
      <Text style={styles.fieldLabel}>{t('settingsPage.hourlyRate')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={hourlyRate}
          onChangeText={(v) => setRateField('hourlyRate', v)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#9aa0ae"
        />
        <Text style={styles.inputSuffix}>$/hr</Text>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('settingsPage.rateType')}</Text>
      <View style={styles.chipRow}>
        {RATE_TYPES.map((rt) => (
          <TouchableOpacity
            key={rt.key}
            style={[styles.chip, rateType === rt.key && styles.chipActive]}
            onPress={() => setRateField('rateType', rt.key)}
          >
            <Text
              style={[
                styles.chipText,
                rateType === rt.key && styles.chipTextActive,
              ]}
            >
              {t(rt.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('settingsPage.taxPercentage')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={taxPercent}
          onChangeText={(v) => setRateField('taxPercent', v)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#9aa0ae"
        />
        <Text style={styles.inputSuffix}>%</Text>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('settingsPage.paymentTermsTitle')}</Text>
      <View style={styles.chipRow}>
        {PAYMENT_TERMS.map((pt) => (
          <TouchableOpacity
            key={pt.key}
            style={[styles.chip, paymentTerms === pt.key && styles.chipActive]}
            onPress={() => setRateField('paymentTerms', pt.key)}
          >
            <Text
              style={[
                styles.chipText,
                paymentTerms === pt.key && styles.chipTextActive,
              ]}
            >
              {t(pt.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, !ratesDirty && styles.saveBtnOff]}
        disabled={!ratesDirty}
        onPress={handleSaveRates}
      >
        <Text
          style={[styles.saveBtnText, !ratesDirty && styles.saveBtnTextOff]}
        >
          {t('common.save')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommunication = () => {
    const cardGroup = (
      items: { key: string; labelKey: string; color: string }[],
      selected: string,
      onSelect: (k: string) => void,
    ) =>
      items.map((item) => {
        const active = selected === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            onPress={() => onSelect(item.key)}
            style={[
              styles.optionCard,
              active && { borderColor: item.color, borderWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.optionCardText,
                active && { color: item.color, fontWeight: '700' },
              ]}
            >
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      });

    return (
      <View style={styles.panel}>
        <Text style={styles.fieldLabel}>{t('settingsPage.responseTime')}</Text>
        <View style={styles.cardGroup}>
          {cardGroup(RESPONSE_TIMES, responseTime, setResponseTime)}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
          {t('settingsPage.meetingStyle')}
        </Text>
        <View style={styles.cardGroup}>
          {cardGroup(MEETING_STYLES, meetingStyle, setMeetingStyle)}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
          {t('settingsPage.feedbackStyle')}
        </Text>
        <View style={styles.cardGroup}>
          {cardGroup(FEEDBACK_STYLES, feedbackStyle, setFeedbackStyle)}
        </View>
      </View>
    );
  };

  const renderExpanded = (id: string) => {
    switch (id) {
      case 'notifications':
        return renderNotifications();
      case 'scope-guardian':
        return renderScopeGuardian();
      case 'rates-pricing':
        return renderRatesPricing();
      case 'communication':
        return renderCommunication();
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t('settingsPage.title')}</Text>

      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AccountSettings')}
      >
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>{userInitial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>
        <Text style={styles.arrow}>{'\u203A'}</Text>
      </TouchableOpacity>

      {SECTIONS.map((section) => {
        const isExpandable = section.id !== 'account';
        const isExpanded = expandedSection === section.id;

        return (
          <React.Fragment key={section.id}>
            <TouchableOpacity
              style={[styles.row, isExpanded && styles.rowExpanded]}
              activeOpacity={0.7}
              onPress={() => handleRowPress(section.id)}
            >
              <View
                style={[
                  styles.rowIconWrap,
                  { backgroundColor: section.iconBg },
                ]}
              >
                <Text
                  style={[styles.rowIconText, { color: section.iconColor }]}
                >
                  {section.icon}
                </Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t(section.labelKey)}</Text>
                <Text style={styles.rowDesc}>{t(section.descriptionKey)}</Text>
              </View>
              <Text style={styles.arrow}>
                {isExpandable
                  ? isExpanded
                    ? '\u25BE'
                    : '\u203A'
                  : '\u203A'}
              </Text>
            </TouchableOpacity>

            {isExpanded && renderExpanded(section.id)}
          </React.Fragment>
        );
      })}

      <View style={[styles.panel, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e2e6ed' }]}>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>{t('settingsPage.biometricUnlock')}</Text>
          <Switch
            value={biometricEnabled}
            onValueChange={(value) => {
              setBiometricEnabled(value);
              AsyncStorage.setItem('scout_biometric_enabled', value ? '1' : '0');
            }}
          />
        </View>
        <TouchableOpacity style={[styles.saveBtn, { marginTop: 12 }]} onPress={requestRuntimePermissions}>
          <Text style={styles.saveBtnText}>{t('settingsPage.requestPermissions')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.fieldLabel}>Support</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('HelpFaq')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.helpFaq')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.fieldLabel}>{t('settingsPage.upcomingSurfaces')}</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('PublicProfile')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.publicProfile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('ProposalForm')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.proposalForm')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('Milestones')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.milestones')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('GlobalSearch')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.globalSearch')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('Inbox')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.unifiedInbox')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('PaymentMethods')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.payments')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('EarningsDashboard')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.earningsDashboard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('Referrals')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.referrals')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('CalendarScheduling')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.calendar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('DisputeReport')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.disputeReport')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('EmailVerification')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.emailVerification')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('TwoFactorEntry')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.twoFactorEntry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('SocialLogin')}>
            <Text style={styles.optionCardText}>{t('settingsPage.links.socialLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { padding: 16, paddingBottom: 32 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f1623',
    marginBottom: 16,
  },

  /* ── User card ── */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    marginBottom: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { color: '#fff', fontWeight: '700', fontSize: 18 },
  userName: { fontWeight: '700', fontSize: 15, color: '#0f1623' },
  userEmail: { fontSize: 13, color: '#9aa0ae', marginTop: 2 },

  /* ── Section rows ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    marginBottom: 8,
  },
  rowExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { fontSize: 16, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowLabel: { fontWeight: '600', fontSize: 14, color: '#0f1623' },
  rowDesc: { fontSize: 12, color: '#9aa0ae', marginTop: 2, lineHeight: 17 },
  arrow: { fontSize: 22, color: '#9aa0ae', fontWeight: '300' },

  /* ── Shared expanded panel ── */
  panel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e6ed',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 16,
    marginBottom: 8,
  },

  /* ── Notifications ── */
  notifItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifLabel: { fontSize: 14, fontWeight: '500', color: '#0f1623' },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 16,
  },
  emailLabel: { fontSize: 12, color: '#9aa0ae' },

  /* ── Scope Guardian ── */
  scopeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scopeIcon: { fontSize: 28 },
  scopeLabel: { fontSize: 16, fontWeight: '700', flex: 1 },
  scopeCheck: { fontSize: 20, fontWeight: '800' },
  scopeDesc: { fontSize: 13, color: '#4a5568', lineHeight: 19 },

  /* ── Rates & Pricing ── */
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    backgroundColor: '#f6f8fb',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1623',
    paddingVertical: 10,
  },
  inputSuffix: { fontSize: 14, color: '#9aa0ae', fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#4a5568' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#1d6ecd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnOff: { backgroundColor: '#e2e6ed' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  saveBtnTextOff: { color: '#9aa0ae' },

  /* ── Communication ── */
  cardGroup: { gap: 8 },
  optionCard: {
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  optionCardText: { fontSize: 14, fontWeight: '500', color: '#4a5568' },
});
