import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HelpFaqScreen() {
  const { t } = useTranslation();
  const faqs = [
    {
      q: t('misc.helpFaq.items.startProject.question'),
      a: t('misc.helpFaq.items.startProject.answer'),
    },
    {
      q: t('misc.helpFaq.items.bookmarks.question'),
      a: t('misc.helpFaq.items.bookmarks.answer'),
    },
    {
      q: t('misc.helpFaq.items.reportIssue.question'),
      a: t('misc.helpFaq.items.reportIssue.answer'),
    },
  ];
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('misc.helpFaq.title')}</Text>
      <Text style={styles.subtitle}>{t('misc.helpFaq.subtitle')}</Text>
      <View style={styles.list}>
        {faqs.map((item) => (
          <View key={item.q} style={styles.card}>
            <Text style={styles.q}>{item.q}</Text>
            <Text style={styles.a}>{item.a}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f1623', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#4a5568', marginBottom: 14 },
  list: { gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff', padding: 14 },
  q: { fontSize: 14, fontWeight: '700', color: '#0f1623', marginBottom: 6 },
  a: { fontSize: 13, color: '#4a5568', lineHeight: 19 },
});
