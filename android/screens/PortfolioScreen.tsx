import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import { isDemoMode } from '../api/demoAdapter';
import { api } from '../api/client';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - 48) / 2;

interface PortfolioItem {
  id: string;
  title: string;
  type: string;
  color: string;
  skills: string[];
}

const DEMO_ITEMS: PortfolioItem[] = [
  { id: '1', title: 'Website Refresh', type: 'Web Design', color: '#3b82f6', skills: ['Figma', 'React', 'Responsive'] },
  { id: '2', title: 'Brand Identity', type: 'Branding', color: '#8b5cf6', skills: ['Illustrator', 'Typography'] },
  { id: '3', title: 'Q2 Pitch Deck', type: 'Presentation', color: '#f97316', skills: ['Keynote', 'Copywriting'] },
  { id: '4', title: 'Mobile App UI', type: 'UI/UX', color: '#10b981', skills: ['Figma', 'Prototyping', 'iOS'] },
];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Web Design': { bg: '#dbeafe', color: '#1d6ecd' },
  Branding: { bg: '#f3e8ff', color: '#7c3aed' },
  Presentation: { bg: '#fff7ed', color: '#ea580c' },
  'UI/UX': { bg: '#dcfce7', color: '#16a34a' },
  Logo: { bg: '#fce7f3', color: '#db2777' },
  Illustration: { bg: '#fef3c7', color: '#d97706' },
};

const DELIVERABLE_TYPES = ['Web Design', 'Branding', 'Presentation', 'UI/UX', 'Logo', 'Illustration'];
const SKILL_OPTIONS = ['Figma', 'React', 'Illustrator', 'Prototyping', 'Typography', 'Responsive', 'Keynote', 'Copywriting', 'iOS', 'CSS'];

export default function PortfolioScreen() {
  const [items, setItems] = useState<PortfolioItem[]>(isDemoMode() ? DEMO_ITEMS : []);

  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/portfolio');
        if (!cancelled && Array.isArray(data)) setItems(data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [aiDesc, setAiDesc] = useState('');
  const [sharePublic, setSharePublic] = useState(true);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleAdd = () => {
    if (!selectedType) return;
    const newItem: PortfolioItem = {
      id: String(Date.now()),
      title: aiDesc || 'Untitled Project',
      type: selectedType,
      color: TYPE_COLORS[selectedType]?.color ?? '#64748b',
      skills: selectedSkills,
    };
    setItems((prev) => [...prev, newItem]);
    resetModal();
  };

  const resetModal = () => {
    setSelectedType(null);
    setSelectedSkills([]);
    setAiDesc('');
    setSharePublic(true);
    setShowAddModal(false);
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>Portfolio</Text>

      <ScrollView contentContainerStyle={s.grid}>
        {items.map((item) => {
          const tc = TYPE_COLORS[item.type] ?? { bg: '#f1f5f9', color: '#64748b' };
          return (
            <View key={item.id} style={[s.card, { width: CARD_W }]}>
              <View style={[s.thumbnail, { backgroundColor: item.color + '22' }]}>
                <View style={[s.thumbInner, { backgroundColor: item.color }]} />
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.typeBadge, { backgroundColor: tc.bg }]}>
                <Text style={[s.typeBadgeText, { color: tc.color }]}>{item.type}</Text>
              </View>
              <View style={s.skillsWrap}>
                {item.skills.map((sk) => (
                  <View key={sk} style={s.skillChip}>
                    <Text style={s.skillChipText}>{sk}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add to Portfolio</Text>

            <Text style={s.label}>Deliverable type</Text>
            <View style={s.chipRow}>
              {DELIVERABLE_TYPES.map((t) => {
                const active = selectedType === t;
                const tc = TYPE_COLORS[t] ?? { bg: '#f1f5f9', color: '#64748b' };
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, active && { backgroundColor: tc.bg, borderColor: tc.color }]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[s.typeChipText, active && { color: tc.color, fontWeight: '700' }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Skills</Text>
            <View style={s.chipRow}>
              {SKILL_OPTIONS.map((sk) => {
                const active = selectedSkills.includes(sk);
                return (
                  <TouchableOpacity
                    key={sk}
                    style={[s.skillSelectChip, active && s.skillSelectChipActive]}
                    onPress={() => toggleSkill(sk)}
                  >
                    <Text style={[s.skillSelectText, active && s.skillSelectTextActive]}>{sk}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>AI description</Text>
            <TextInput
              style={s.input}
              placeholder="Describe this portfolio piece..."
              value={aiDesc}
              onChangeText={setAiDesc}
              multiline
              numberOfLines={3}
            />

            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Share publicly?</Text>
              <Switch value={sharePublic} onValueChange={setSharePublic} trackColor={{ true: '#1d6ecd' }} />
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.primaryBtn} onPress={handleAdd}>
                <Text style={s.primaryBtnText}>Add to Portfolio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={resetModal}>
                <Text style={s.ghostBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623', padding: 16, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e6ed', padding: 10, gap: 6 },
  thumbnail: { height: 90, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  thumbInner: { width: 36, height: 36, borderRadius: 8, opacity: 0.6 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#0f1623' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  skillChipText: { fontSize: 10, color: '#4a5568', fontWeight: '500' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1d6ecd', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f1623' },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff' },
  typeChipText: { fontSize: 12, color: '#4a5568' },
  skillSelectChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff' },
  skillSelectChipActive: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  skillSelectText: { fontSize: 12, color: '#4a5568' },
  skillSelectTextActive: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#f9fafb', textAlignVertical: 'top', minHeight: 60 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, color: '#4a5568' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: { flex: 1, backgroundColor: '#1d6ecd', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: '#4a5568', fontWeight: '600', fontSize: 14 },
});
