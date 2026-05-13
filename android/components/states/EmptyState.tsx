import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
  },
});
