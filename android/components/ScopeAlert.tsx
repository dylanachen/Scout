import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ScopeAlertPayload = {
  id: string;
  message: string;
  suggested_reply?: string;
  contract_clause?: string;
  after_message_id?: string;
};

type Props = {
  alert: ScopeAlertPayload;
  onDismiss?: (id: string) => void;
};

/** Private AI Scope Guardian card (freelancer-only in product). */
export default function ScopeAlert({ alert, onDismiss }: Props) {
  const { id, message, suggested_reply, contract_clause } = alert;

  const dismiss = () => onDismiss?.(id);

  const copyReply = async () => {
    if (!suggested_reply) return;
    await Clipboard.setStringAsync(suggested_reply);
    Alert.alert('Copied', 'Suggested reply copied to clipboard.');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>!</Text>
        </View>
        <Text style={styles.title}>AI Scope Guardian · Private</Text>
        {onDismiss ? (
          <TouchableOpacity onPress={dismiss} hitSlop={12} accessibilityLabel="Dismiss">
            <Text style={styles.close}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.body}>{message}</Text>

      {contract_clause ? (
        <View style={styles.refBox}>
          <Text style={styles.refText}>
            <Text style={styles.refStrong}>Contract ref: </Text>
            {contract_clause}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {suggested_reply ? (
          <ScopeBtn label="Copy suggested reply" onPress={copyReply} />
        ) : null}
        <ScopeBtn label="Draft change order" onPress={() => Alert.alert('Coming soon', 'Wire to change-order flow.')} />
        <ScopeBtn label="Log decision" onPress={() => Alert.alert('Coming soon', 'Wire to decision logger.')} />
        {onDismiss ? <ScopeBtn label="Dismiss" onPress={dismiss} /> : null}
      </View>
    </View>
  );
}

function ScopeBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderLeftWidth: 3,
    borderLeftColor: '#c2410c',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c2410c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#c2410c',
  },
  close: { fontSize: 18, color: '#9aa0ae', lineHeight: 20 },
  body: { fontSize: 12, color: '#7c2d12', lineHeight: 18, marginBottom: 10 },
  refBox: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  refText: { fontSize: 11, color: '#7c2d12' },
  refStrong: { fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff',
  },
  btnText: { fontSize: 11, fontWeight: '500', color: '#c2410c' },
});
