import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export type ScopeAlertPayload = {
  id: string;
  message: string;
  suggested_reply?: string;
  contract_clause?: string;
  after_message_id?: string;
  severity?: 'low' | 'medium' | 'high';
  explanation?: string;
};

type Props = {
  alert: ScopeAlertPayload;
  onDismiss?: (id: string) => void;
};

function severityColor(sev?: string) {
  switch (sev) {
    case 'high':
      return { bg: '#fef2f2', fg: '#dc2626' };
    case 'low':
      return { bg: '#f0fdf4', fg: '#16a34a' };
    default:
      return { bg: '#fffbeb', fg: '#d97706' };
  }
}

export default function ScopeAlert({ alert, onDismiss }: Props) {
  const { id, message, severity = 'medium', explanation, contract_clause } = alert;
  const sev = severityColor(severity);
  const dismiss = () => onDismiss?.(id);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
        <Text style={styles.title}>Scope Flag</Text>
        <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
          <Text style={[styles.sevText, { color: sev.fg }]}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={dismiss} hitSlop={12} style={styles.closeWrap}>
            <Text style={styles.close}>{'\u00d7'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.body}>{message}</Text>

      {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}

      {contract_clause ? (
        <View style={styles.refBox}>
          <Text style={styles.refText}>
            <Text style={styles.refStrong}>Contract ref: </Text>
            {contract_clause}
          </Text>
        </View>
      ) : null}

      <Text style={styles.respondHeading}>How do you want to respond?</Text>

      <View style={styles.actions}>
        <ChipBtn
          label="Send change order"
          onPress={() => Alert.alert('Change Order', 'Wire to change-order flow.')}
        />
        <ChipBtn
          label="Discuss with client"
          onPress={() => Alert.alert('Discuss', 'Wire to discussion flow.')}
        />
        <ChipBtn label="Dismiss" onPress={dismiss} />
      </View>
    </View>
  );
}

function ChipBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  lockIcon: { fontSize: 14 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  sevBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sevText: { fontSize: 10, fontWeight: '600' },
  closeWrap: { marginLeft: 'auto' },
  close: { fontSize: 18, color: '#9aa0ae', lineHeight: 20 },
  body: { fontSize: 13, color: '#78350f', lineHeight: 19, marginBottom: 6 },
  explanation: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  refBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  refText: { fontSize: 11, color: '#78350f' },
  refStrong: { fontWeight: '700' },
  respondHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
    marginTop: 2,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#b45309' },
});
