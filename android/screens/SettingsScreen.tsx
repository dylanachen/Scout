import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { id: 'notifications', label: 'Notifications', icon: 'N', iconBg: '#dbeafe', iconColor: '#1d6ecd', description: 'Push and email notification preferences' },
  { id: 'scope-guardian', label: 'Scope Guardian', icon: '!', iconBg: '#fef3c7', iconColor: '#d97706', description: 'Set how aggressively we flag scope changes' },
  { id: 'rates-pricing', label: 'Rates & Pricing', icon: '$', iconBg: '#dcfce7', iconColor: '#16a34a', description: 'Default hourly rate, tax, payment terms' },
  { id: 'communication', label: 'Communication Preferences', icon: 'C', iconBg: '#f3e8ff', iconColor: '#7c3aed', description: 'Response time, meeting style, feedback' },
  { id: 'account', label: 'Account', icon: 'A', iconBg: '#fce7f3', iconColor: '#db2777', description: 'Profile, password, log out, delete account' },
];

const NOTIFICATION_TYPES = [
  { key: 'messages', label: 'Messages' },
  { key: 'scopeFlags', label: 'Scope flags' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'timeAlerts', label: 'Time alerts' },
];

const SCOPE_LEVELS = [
  {
    key: 'relaxed',
    label: 'Relaxed',
    icon: '\uD83D\uDEE1\uFE0F',
    desc: 'Only flag major scope changes. Best for flexible projects with evolving requirements.',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    icon: '\uD83D\uDEE1\uFE0F',
    desc: 'Flag moderate and major changes. Recommended for most projects.',
    color: '#ca8a04',
    bg: '#fefce8',
  },
  {
    key: 'strict',
    label: 'Strict',
    icon: '\uD83D\uDEE1\uFE0F',
    desc: 'Flag all scope changes, however small. Best for fixed-bid work.',
    color: '#dc2626',
    bg: '#fef2f2',
  },
];

const RATE_TYPES = [
  { key: 'hourly', label: 'Hourly' },
  { key: 'perProject', label: 'Per Project' },
  { key: 'retainer', label: 'Retainer' },
];

const PAYMENT_TERMS = [
  { key: 'net15', label: 'Net 15' },
  { key: 'net30', label: 'Net 30' },
  { key: 'net45', label: 'Net 45' },
  { key: 'upon', label: 'Upon completion' },
];

const RESPONSE_TIMES = [
  { key: 'withinHours', label: 'Within hours', color: '#16a34a' },
  { key: 'sameDay', label: 'Same day', color: '#ca8a04' },
  { key: 'within48h', label: 'Within 48h', color: '#6366f1' },
];

const MEETING_STYLES = [
  { key: 'video', label: 'Video calls', color: '#1d6ecd' },
  { key: 'audio', label: 'Audio only', color: '#16a34a' },
  { key: 'written', label: 'Written only', color: '#7c3aed' },
];

const FEEDBACK_STYLES = [
  { key: 'direct', label: 'Direct and honest', color: '#dc2626' },
  { key: 'diplomatic', label: 'Diplomatic', color: '#1d6ecd' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'user@freelanceos.com';
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

  const handleRowPress = (id: string) => {
    if (id === 'account') {
      navigation.navigate('AccountSettings');
      return;
    }
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const toggleNotif = (key: string) =>
    setNotifToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleEmail = (key: string) =>
    setEmailToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const setRateField = (field: string, value: string) => {
    setRatesDirty(true);
    if (field === 'hourlyRate') setHourlyRate(value);
    else if (field === 'rateType') setRateType(value);
    else if (field === 'taxPercent') setTaxPercent(value);
    else if (field === 'paymentTerms') setPaymentTerms(value);
  };

  const handleSaveRates = () => {
    setRatesDirty(false);
    Alert.alert('Saved', 'Your rates & pricing preferences have been saved.');
  };

  /* ── Section renderers ── */

  const renderNotifications = () => (
    <View style={styles.panel}>
      {NOTIFICATION_TYPES.map((nt) => (
        <View key={nt.key} style={styles.notifItem}>
          <View style={styles.notifRow}>
            <Text style={styles.notifLabel}>{nt.label}</Text>
            <Switch
              value={notifToggles[nt.key]}
              onValueChange={() => toggleNotif(nt.key)}
              trackColor={{ false: '#e2e6ed', true: '#93c5fd' }}
              thumbColor={notifToggles[nt.key] ? '#1d6ecd' : '#f4f4f5'}
            />
          </View>
          {notifToggles[nt.key] && (
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>Also notify by email</Text>
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
                {level.label}
              </Text>
              {active && (
                <Text style={[styles.scopeCheck, { color: level.color }]}>
                  {'\u2713'}
                </Text>
              )}
            </View>
            <Text style={styles.scopeDesc}>{level.desc}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderRatesPricing = () => (
    <View style={styles.panel}>
      <Text style={styles.fieldLabel}>Hourly Rate</Text>
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

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Rate Type</Text>
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
              {rt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Tax Percentage</Text>
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

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Payment Terms</Text>
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
              {pt.label}
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
          Save
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommunication = () => {
    const cardGroup = (
      items: { key: string; label: string; color: string }[],
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
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      });

    return (
      <View style={styles.panel}>
        <Text style={styles.fieldLabel}>Response Time</Text>
        <View style={styles.cardGroup}>
          {cardGroup(RESPONSE_TIMES, responseTime, setResponseTime)}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
          Meeting Style
        </Text>
        <View style={styles.cardGroup}>
          {cardGroup(MEETING_STYLES, meetingStyle, setMeetingStyle)}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
          Feedback Style
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
      <Text style={styles.heading}>Settings</Text>

      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AccountSettings')}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>{userInitial}</Text>
        </View>
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
                <Text style={styles.rowLabel}>{section.label}</Text>
                <Text style={styles.rowDesc}>{section.description}</Text>
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
