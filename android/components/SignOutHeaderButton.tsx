import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SignOutHeaderButton() {
  const { signOut } = useAuth();
  return (
    <TouchableOpacity onPress={() => void signOut()} style={styles.wrap} hitSlop={8}>
      <Text style={styles.text}>Sign out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 4, paddingVertical: 4, paddingHorizontal: 8 },
  text: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
