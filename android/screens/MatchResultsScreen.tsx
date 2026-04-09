import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isDemoMode } from '../api/demoAdapter';
import { api } from '../api/client';

type MatchData = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  location: string;
  overallScore: number;
  scores: { skillFit: number; communication: number; timeline: number; budget: number };
  explanation: string;
  timelineTightWarning: boolean;
  availability: 'now' | 'soon' | 'unavailable';
  clientRating: number;
};

const MOCK_MATCHES: MatchData[] = [
  {
    id: 'm1',
    name: 'Jordan Kim',
    role: 'Marketing Director',
    specialty: 'Brand & campaigns',
    location: 'Los Angeles, CA',
    overallScore: 87,
    scores: { skillFit: 92, communication: 78, timeline: 65, budget: 88 },
    explanation:
      "We matched you because you've both worked on brand identity projects with async communication preferences.",
    timelineTightWarning: true,
    availability: 'now',
    clientRating: 4.8,
  },
  {
    id: 'm2',
    name: 'Sam Okonkwo',
    role: 'Product Lead',
    specialty: 'B2B SaaS',
    location: 'London, UK',
    overallScore: 79,
    scores: { skillFit: 84, communication: 81, timeline: 72, budget: 76 },
    explanation:
      'Strong overlap on discovery workshops and design systems for growing product teams.',
    timelineTightWarning: false,
    availability: 'soon',
    clientRating: 4.5,
  },
  {
    id: 'm3',
    name: 'Riley Chen',
    role: 'Founder',
    specialty: 'Early-stage startups',
    location: 'San Francisco, CA',
    overallScore: 91,
    scores: { skillFit: 95, communication: 88, timeline: 86, budget: 90 },
    explanation:
      'You both prefer written briefs, milestone-based delivery, and similar budget bands.',
    timelineTightWarning: false,
    availability: 'now',
    clientRating: 4.9,
  },
];

const PORTFOLIO_COLORS = [
  ['#6366f1', '#ec4899', '#f59e0b'],
  ['#14b8a6', '#8b5cf6', '#ef4444'],
  ['#3b82f6', '#10b981', '#f97316'],
];

type SortKey = 'bestMatch' | 'skillFit' | 'timeline' | 'budget';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'bestMatch', label: 'Best Match' },
  { key: 'skillFit', label: 'Skill Fit' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'budget', label: 'Budget' },
];

function scoreColor(v: number) {
  if (v >= 80) return '#16a34a';
  if (v >= 60) return '#ca8a04';
  return '#dc2626';
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = ['#6366f1', '#1d6ecd', '#16a34a', '#ca8a04', '#dc2626'];
  const idx = name.length % colors.length;
  return (
    <View style={[styles.avatar, { backgroundColor: colors[idx] }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreLabelRow}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreValue}>{value}%</Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${value}%`, backgroundColor: scoreColor(value) },
          ]}
        />
      </View>
    </View>
  );
}

function MatchCard({
  match,
  viewerRole,
  colorIndex,
}: {
  match: MatchData;
  viewerRole: 'freelancer' | 'client';
  colorIndex: number;
}) {
  const [interestSent, setInterestSent] = useState(false);
  const [passed, setPassed] = useState(false);
  const disabled = interestSent || passed;
  const sc = scoreColor(match.overallScore);
  const thumbColors = PORTFOLIO_COLORS[colorIndex % PORTFOLIO_COLORS.length];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar name={match.name} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{match.name}</Text>
          <Text style={styles.cardRole}>
            {match.role}
            {match.specialty ? ` \u00B7 ${match.specialty}` : ''}
          </Text>
          {match.location ? (
            <Text style={{ fontSize: 11, color: '#9aa0ae', marginTop: 2 }}>
              {match.location}
            </Text>
          ) : null}
          {match.availability !== 'unavailable' && (
            <View style={styles.availRow}>
              <View
                style={[
                  styles.availDot,
                  {
                    backgroundColor:
                      match.availability === 'now' ? '#16a34a' : '#ca8a04',
                  },
                ]}
              />
              <Text
                style={[
                  styles.availText,
                  {
                    color:
                      match.availability === 'now' ? '#16a34a' : '#ca8a04',
                  },
                ]}
              >
                {match.availability === 'now'
                  ? 'Available now'
                  : 'Available soon'}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.scoreCircle, { borderColor: sc }]}>
          <Text style={[styles.scorePercent, { color: sc }]}>
            {match.overallScore}%
          </Text>
          <Text style={styles.scoreMatchLabel}>match</Text>
        </View>
      </View>

      <View style={styles.scoresGrid}>
        <ScoreBar label="Skill Fit" value={match.scores.skillFit} />
        <ScoreBar
          label="Communication Style"
          value={match.scores.communication}
        />
        <ScoreBar label="Timeline Match" value={match.scores.timeline} />
        <ScoreBar label="Budget Alignment" value={match.scores.budget} />
      </View>

      <View style={styles.portfolioRow}>
        {thumbColors.map((color, i) => (
          <View
            key={i}
            style={[styles.portfolioThumb, { backgroundColor: color }]}
          />
        ))}
      </View>

      <Text style={styles.explanation}>{match.explanation}</Text>

      {viewerRole === 'freelancer' && (
        <View style={styles.reputationBadge}>
          <Text style={styles.reputationText}>
            {'\u2B50'} {match.clientRating.toFixed(1)} avg client rating
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            match.name,
            `Role: ${match.role}\nSpecialty: ${match.specialty}\nLocation: ${match.location}\n\nOverall Match: ${match.overallScore}%\nSkill Fit: ${match.scores.skillFit}%\nCommunication: ${match.scores.communication}%\nTimeline: ${match.scores.timeline}%\nBudget: ${match.scores.budget}%\n\nClient Rating: ${match.clientRating.toFixed(1)}/5.0`,
          )
        }
      >
        <Text style={styles.viewProfile}>View full profile</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.interestedBtn, disabled && styles.btnOff]}
          disabled={disabled}
          onPress={() => setInterestSent(true)}
        >
          <Text style={[styles.interestedText, disabled && styles.btnTextOff]}>
            {interestSent ? 'Interest sent' : "I'm interested"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.passBtn, disabled && styles.btnOff]}
          disabled={disabled}
          onPress={() => setPassed(true)}
        >
          <Text style={[styles.passText, disabled && styles.btnTextOff]}>
            {passed ? 'Passed' : 'Pass'}
          </Text>
        </TouchableOpacity>
      </View>

      {viewerRole === 'freelancer' && match.timelineTightWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {'\u26A0\uFE0F'}{' '}
            <Text style={{ fontWeight: '700' }}>Heads up:</Text> This timeline
            may be tight for the described scope
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MatchResultsScreen() {
  const navigation = useNavigation<any>();
  const [sortBy, setSortBy] = useState<SortKey>('bestMatch');
  const [viewerRole] = useState<'freelancer' | 'client'>('freelancer');
  const [matchData, setMatchData] = useState<MatchData[]>(isDemoMode() ? MOCK_MATCHES : []);

  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/matches');
        if (!cancelled && Array.isArray(data)) setMatchData(data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    const arr = [...matchData];
    switch (sortBy) {
      case 'skillFit':
        arr.sort((a, b) => b.scores.skillFit - a.scores.skillFit);
        break;
      case 'timeline':
        arr.sort((a, b) => b.scores.timeline - a.scores.timeline);
        break;
      case 'budget':
        arr.sort((a, b) => b.scores.budget - a.scores.budget);
        break;
      default:
        arr.sort((a, b) => b.overallScore - a.overallScore);
    }
    return arr;
  }, [sortBy]);

  if (matchData.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Text style={{ fontSize: 32, color: '#9aa0ae' }}>{'\u2026'}</Text>
        </View>
        <Text style={styles.emptyTitle}>
          We're still building your matches
        </Text>
        <Text style={styles.emptyDesc}>Check back soon</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.emptyBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.heading}>Your Matches</Text>
      <Text style={styles.count}>{sorted.length} freelancers matched</Text>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.sortChip,
              sortBy === opt.key && styles.sortChipActive,
            ]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === opt.key && styles.sortChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.map((m, idx) => (
        <MatchCard
          key={m.id}
          match={m}
          viewerRole={viewerRole}
          colorIndex={idx}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f1623',
    marginBottom: 4,
  },
  count: { fontSize: 13, color: '#9aa0ae', marginBottom: 16 },

  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
  },
  sortChipActive: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  sortChipText: { fontSize: 12, fontWeight: '500', color: '#4a5568' },
  sortChipTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { fontWeight: '700', fontSize: 16, color: '#0f1623' },
  cardRole: { fontSize: 13, color: '#4a5568', marginTop: 2 },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 11, fontWeight: '500' },

  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePercent: { fontSize: 18, fontWeight: '800' },
  scoreMatchLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9aa0ae',
    textTransform: 'uppercase',
  },

  scoresGrid: { gap: 10, marginBottom: 12 },
  scoreRow: {},
  scoreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabel: { fontSize: 11, fontWeight: '600', color: '#4a5568' },
  scoreValue: { fontSize: 11, color: '#9aa0ae' },
  scoreBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e8ecf2',
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  portfolioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  portfolioThumb: {
    width: 72,
    height: 52,
    borderRadius: 8,
  },

  explanation: {
    fontSize: 13,
    color: '#4a5568',
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: 10,
  },

  reputationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  reputationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#854d0e',
  },

  viewProfile: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d6ecd',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },

  actionRow: { flexDirection: 'row', gap: 10 },
  interestedBtn: {
    flex: 1,
    backgroundColor: '#1d6ecd',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  interestedText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  passBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  passText: { color: '#4a5568', fontWeight: '600', fontSize: 13 },
  btnOff: { backgroundColor: '#e8ecf2', borderColor: '#e8ecf2' },
  btnTextOff: { color: '#9aa0ae' },

  warningBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  warningText: { fontSize: 12, color: '#854d0e', lineHeight: 18 },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f1623',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9aa0ae',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: '#1d6ecd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
