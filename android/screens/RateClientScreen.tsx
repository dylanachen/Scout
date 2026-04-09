import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface RatingRow {
  key: string;
  label: string;
  question: string;
}

const RATING_ROWS: RatingRow[] = [
  { key: 'assets', label: 'Asset delivery', question: 'Did the client deliver assets on time and as expected?' },
  { key: 'communication', label: 'Communication', question: 'Was the client responsive and clear in communication?' },
  { key: 'scope', label: 'Scope respect', question: 'Did the client respect the agreed scope?' },
  { key: 'payment', label: 'Payment speed', question: 'Was payment made on time?' },
];

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.6}>
          <Text style={[s.star, star <= value ? s.starFilled : s.starEmpty]}>
            {'\u2605'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateClientScreen() {
  const navigation = useNavigation<any>();
  const [ratings, setRatings] = useState<Record<string, number>>({
    assets: 0,
    communication: 0,
    scope: 0,
    payment: 0,
  });
  const [feedback, setFeedback] = useState('');

  const setRating = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const overall = useMemo(() => {
    const vals = Object.values(ratings);
    const rated = vals.filter((v) => v > 0);
    if (rated.length === 0) return 0;
    return Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;
  }, [ratings]);

  const handleSubmit = () => {
    Alert.alert('Rating submitted', `Overall score: ${overall}/5`);
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleSkip = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>Rate Client</Text>
      <Text style={s.subheading}>Your rating is private and helps the freelancer community</Text>

      <View style={s.clientCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>JK</Text>
        </View>
        <Text style={s.clientName}>Jordan Kim</Text>
      </View>

      {RATING_ROWS.map((row) => (
        <View key={row.key} style={s.ratingCard}>
          <Text style={s.ratingLabel}>{row.label}</Text>
          <Text style={s.ratingQuestion}>{row.question}</Text>
          <StarRow value={ratings[row.key]} onChange={(v) => setRating(row.key, v)} />
        </View>
      ))}

      <View style={s.overallCard}>
        <Text style={s.overallLabel}>Overall Score</Text>
        <Text style={s.overallValue}>{overall > 0 ? overall.toFixed(1) : '\u2014'}</Text>
        <Text style={s.overallSub}>{overall > 0 ? 'out of 5' : 'Rate all categories'}</Text>
      </View>

      <Text style={s.feedbackLabel}>Additional feedback (optional)</Text>
      <TextInput
        style={s.feedbackInput}
        placeholder="Share any additional thoughts about working with this client..."
        value={feedback}
        onChangeText={setFeedback}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity style={s.primaryBtn} onPress={handleSubmit}>
        <Text style={s.primaryBtnText}>Submit Rating</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.ghostBtn} onPress={handleSkip}>
        <Text style={s.ghostBtnText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623' },
  subheading: { fontSize: 13, color: '#9aa0ae', marginTop: 4, marginBottom: 16 },
  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d6ecd', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0f1623' },
  ratingCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', marginBottom: 10, gap: 6 },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: '#0f1623' },
  ratingQuestion: { fontSize: 12, color: '#4a5568', lineHeight: 17 },
  starRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  star: { fontSize: 28 },
  starFilled: { color: '#f59e0b' },
  starEmpty: { color: '#e2e6ed' },
  overallCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', alignItems: 'center', marginVertical: 12, gap: 2 },
  overallLabel: { fontSize: 13, fontWeight: '600', color: '#9aa0ae' },
  overallValue: { fontSize: 36, fontWeight: '700', color: '#0f1623' },
  overallSub: { fontSize: 12, color: '#9aa0ae' },
  feedbackLabel: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  feedbackInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#1d6ecd', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghostBtn: { borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { color: '#4a5568', fontWeight: '600', fontSize: 15 },
});
