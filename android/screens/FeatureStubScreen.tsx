import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  route?: {
    params?: {
      title?: string;
      description?: string;
      profile?: {
        name?: string;
        role?: string;
        avatarUrl?: string | null;
      };
    };
  };
};

const MOCK_ITEMS = ['Mock item A', 'Mock item B', 'Mock item C'];

export default function FeatureStubScreen({ route }: Props) {
  const { t } = useTranslation();
  const title = route?.params?.title ?? t('misc.featureStub.title');
  const description = route?.params?.description ?? t('misc.featureStub.subtitle');
  const profile = route?.params?.profile;
  const initial = (profile?.name ?? '?').trim().slice(0, 1).toUpperCase();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>

      {profile ? (
        <View style={styles.profileCard}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.name ?? t('misc.featureStub.profileName')}</Text>
            <Text style={styles.profileMeta}>{profile.role ?? t('misc.featureStub.profileRole')}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('misc.featureStub.previewData')}</Text>
        {MOCK_ITEMS.map((item) => (
          <Text key={item} style={styles.item}>• {item}</Text>
        ))}
      </View>

      <TouchableOpacity style={styles.primary} accessibilityRole="button" accessibilityLabel={t('misc.featureStub.primaryAction')}>
        <Text style={styles.primaryText}>{t('misc.featureStub.primaryAction')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} accessibilityRole="button" accessibilityLabel={t('misc.featureStub.secondaryAction')}>
        <Text style={styles.secondaryText}>{t('misc.featureStub.secondaryAction')}</Text>
      </TouchableOpacity>

      <Text style={styles.todo}>{t('misc.featureStub.todo')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f1623', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#4a5568', marginBottom: 16 },
  profileCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarFallback: {
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#0f1623' },
  profileMeta: { fontSize: 13, color: '#4a5568', marginTop: 2 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff', padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f1623', marginBottom: 8 },
  item: { fontSize: 13, color: '#4a5568', marginBottom: 4 },
  primary: { borderRadius: 10, backgroundColor: '#1d6ecd', padding: 12, alignItems: 'center', marginBottom: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { borderRadius: 10, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff', padding: 12, alignItems: 'center' },
  secondaryText: { color: '#0f1623', fontWeight: '600' },
  todo: { marginTop: 16, fontSize: 12, color: '#9aa0ae' },
});
