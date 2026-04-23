import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function Skeleton({ height = 56 }: { height?: number }) {
  const { colors } = useAppTheme();
  return <View style={[styles.block, { height, backgroundColor: colors.surfaceAlt }]} />;
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 10,
    width: '100%',
  },
});
