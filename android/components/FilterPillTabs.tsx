import React from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

export type FilterPillTab<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  tabs: FilterPillTab<T>[];
  active: T;
  onChange: (value: T) => void;
};

/**
 * Horizontal pill filters. Prevents Android from clipping or squishing tab labels.
 */
export default function FilterPillTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <TouchableOpacity
            key={String(tab.value)}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onChange(tab.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
  },
  pillActive: {
    backgroundColor: '#1d6ecd',
    borderColor: '#1d6ecd',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4a5568',
    lineHeight: Platform.OS === 'android' ? 18 : undefined,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  pillTextActive: {
    color: '#fff',
  },
});
