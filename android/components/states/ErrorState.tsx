import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    padding: 12,
    gap: 8,
  },
  message: {
    color: '#991b1b',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
