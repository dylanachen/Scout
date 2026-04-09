import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const AUTO_ADVANCE_MS = 5000;

const SLIDES = [
  {
    icon: '💬',
    heading: 'Find your perfect match through a conversation, not a form',
    description: 'Our AI interviews you like a human would — then finds clients who actually fit your style.',
    color: '#dbeafe',
  },
  {
    icon: '🛡️',
    heading: 'AI that watches your back while you work',
    description: 'Scope creep detection, smart contract monitoring, and suggested responses — all in real time.',
    color: '#fef3c7',
  },
  {
    icon: '💰',
    heading: 'Protect your time, get paid what you\'re owed',
    description: 'Automatic time tracking, AI-drafted invoices, and built-in change orders so nothing falls through the cracks.',
    color: '#dcfce7',
  },
];

type AuthStackParamList = {
  OnboardingCarousel: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export default function OnboardingCarouselScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLast = current === SLIDES.length - 1;

  const scrollToIndex = useCallback((idx: number) => {
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (current < SLIDES.length - 1) {
      timerRef.current = setTimeout(() => {
        scrollToIndex(current + 1);
      }, AUTO_ADVANCE_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, scrollToIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== current && idx >= 0 && idx < SLIDES.length) {
      setCurrent(idx);
    }
  };

  return (
    <View style={styles.container}>
      {!isLast && (
        <View style={styles.skipWrap}>
          <TouchableOpacity onPress={() => navigation.replace('SignUp')} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.heading}>{item.heading}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.bottomSection}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.replace('SignUp')}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.ghostBtnText}>Log In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ height: 120 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  skipWrap: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipText: { fontSize: 14, fontWeight: '500', color: '#9aa0ae' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: { fontSize: 48 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    color: '#0f1623',
    marginBottom: 12,
    maxWidth: 340,
  },
  description: {
    fontSize: 15,
    color: '#9aa0ae',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  bottomSection: { paddingHorizontal: 32, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: '#1d6ecd' },
  dotInactive: { width: 8, backgroundColor: '#e2e6ed' },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: '#1d6ecd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ghostBtnText: { color: '#1d6ecd', fontSize: 15, fontWeight: '600' },
});
