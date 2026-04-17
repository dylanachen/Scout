import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  SectionList,
} from 'react-native';
import { api } from '../api/client';
import useDemoActive from '../hooks/useDemoActive';

const DEMO_PROJECTS = ['Website Refresh', 'Pitch Deck'];

interface TimeEntry {
  id: string;
  project: string;
  date: string;
  hours: number;
  description: string;
  planned: boolean;
}

const DEMO_ENTRIES: TimeEntry[] = [
  { id: '1', project: 'Website Refresh', date: '2025-06-04', hours: 3.5, description: 'Homepage wireframes', planned: true },
  { id: '2', project: 'Website Refresh', date: '2025-06-04', hours: 1.0, description: 'Client-requested nav revision', planned: false },
  { id: '3', project: 'Pitch Deck', date: '2025-06-03', hours: 2.0, description: 'Slide layouts and copy', planned: true },
  { id: '4', project: 'Website Refresh', date: '2025-06-03', hours: 1.5, description: 'Asset exports', planned: true },
  { id: '5', project: 'Pitch Deck', date: '2025-06-02', hours: 4.0, description: 'Research & moodboard', planned: true },
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimeTrackingScreen() {
  const demoActive = useDemoActive();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showStopModal, setShowStopModal] = useState(false);
  const [stopNote, setStopNote] = useState('');
  const [stopPlanned, setStopPlanned] = useState(true);

  const [showManual, setShowManual] = useState(false);
  const [manualProject, setManualProject] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualHours, setManualHours] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualPlanned, setManualPlanned] = useState(true);
  const [showManualPicker, setShowManualPicker] = useState(false);

  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    if (demoActive) {
      setProjectNames(DEMO_PROJECTS);
      setSelectedProject(DEMO_PROJECTS[0]);
      setManualProject(DEMO_PROJECTS[0]);
      setEntries(DEMO_ENTRIES);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [projectsRes, entriesRes] = await Promise.all([
          api.get('/projects'),
          api.get('/time-entries'),
        ]);
        if (cancelled) return;
        if (Array.isArray(projectsRes.data)) {
          const names = projectsRes.data.map((p: any) => p.name || p.title || '');
          setProjectNames(names);
          if (names.length) { setSelectedProject(names[0]); setManualProject(names[0]); }
        }
        if (Array.isArray(entriesRes.data)) setEntries(entriesRes.data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [demoActive]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleStart = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const handlePause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setShowStopModal(true);
  }, []);

  const handleSaveStop = () => {
    if (elapsed > 0) {
      const newEntry: TimeEntry = {
        id: String(Date.now()),
        project: selectedProject,
        date: new Date().toISOString().slice(0, 10),
        hours: Math.round((elapsed / 3600) * 100) / 100,
        description: stopNote || 'Timer session',
        planned: stopPlanned,
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
    setElapsed(0);
    setStopNote('');
    setStopPlanned(true);
    setShowStopModal(false);
  };

  const handleSaveManual = () => {
    const hrs = parseFloat(manualHours);
    if (!hrs || hrs <= 0) return;
    const newEntry: TimeEntry = {
      id: String(Date.now()),
      project: manualProject,
      date: manualDate,
      hours: hrs,
      description: manualDesc || 'Manual entry',
      planned: manualPlanned,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setManualHours('');
    setManualDesc('');
    setManualPlanned(true);
    setShowManual(false);
  };

  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});
  const sections = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ title: date, data: grouped[date] }));

  function ProjectDropdown({
    value,
    onSelect,
    open,
    setOpen,
  }: {
    value: string;
    onSelect: (v: string) => void;
    open: boolean;
    setOpen: (v: boolean) => void;
  }) {
    return (
      <View style={{ zIndex: 10 }}>
        <TouchableOpacity style={s.dropdown} onPress={() => setOpen(!open)}>
          <Text style={s.dropdownText}>{value}</Text>
          <Text style={{ color: '#9aa0ae' }}>{open ? '\u25B2' : '\u25BC'}</Text>
        </TouchableOpacity>
        {open && (
          <View style={s.dropdownList}>
            {projectNames.map((p) => (
              <TouchableOpacity
                key={p}
                style={s.dropdownItem}
                onPress={() => { onSelect(p); setOpen(false); }}
              >
                <Text style={[s.dropdownText, p === value && { fontWeight: '700', color: '#1d6ecd' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.heading}>Time Tracking</Text>

      {/* Timer */}
      <View style={s.card}>
        <Text style={s.timer}>{formatTime(elapsed)}</Text>
        <ProjectDropdown value={selectedProject} onSelect={setSelectedProject} open={showProjectPicker} setOpen={setShowProjectPicker} />
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#16a34a' }]} onPress={handleStart} disabled={running}>
            <Text style={s.btnLabel}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#d97706' }]} onPress={handlePause} disabled={!running}>
            <Text style={s.btnLabel}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#dc2626' }]} onPress={handleStop} disabled={elapsed === 0}>
            <Text style={s.btnLabel}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stop modal */}
      <Modal visible={showStopModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>What were you working on?</Text>
            <TextInput style={s.input} placeholder="Description..." value={stopNote} onChangeText={setStopNote} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Planned or unplanned?</Text>
              <TouchableOpacity
                style={[s.toggle, stopPlanned ? s.toggleOn : s.toggleOff]}
                onPress={() => setStopPlanned(!stopPlanned)}
              >
                <Text style={s.toggleText}>{stopPlanned ? 'Planned' : 'Unplanned'}</Text>
              </TouchableOpacity>
            </View>
            {!stopPlanned && (
              <View style={s.warningBanner}>
                <Text style={s.warningText}>This session will be logged as unplanned work</Text>
              </View>
            )}
            <TouchableOpacity style={s.primaryBtn} onPress={handleSaveStop}>
              <Text style={s.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual entry */}
      <TouchableOpacity style={s.manualToggle} onPress={() => setShowManual(!showManual)}>
        <Text style={s.manualToggleText}>{showManual ? 'Hide manual entry' : '+ Add manual entry'}</Text>
      </TouchableOpacity>

      {showManual && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Manual Entry</Text>
          <ProjectDropdown value={manualProject} onSelect={setManualProject} open={showManualPicker} setOpen={setShowManualPicker} />
          <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" value={manualDate} onChangeText={setManualDate} />
          <TextInput style={s.input} placeholder="Hours" keyboardType="numeric" value={manualHours} onChangeText={setManualHours} />
          <TextInput style={s.input} placeholder="Description" value={manualDesc} onChangeText={setManualDesc} />
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Planned?</Text>
            <TouchableOpacity
              style={[s.toggle, manualPlanned ? s.toggleOn : s.toggleOff]}
              onPress={() => setManualPlanned(!manualPlanned)}
            >
              <Text style={s.toggleText}>{manualPlanned ? 'Planned' : 'Unplanned'}</Text>
            </TouchableOpacity>
          </View>
          {!manualPlanned && (
            <View style={s.warningBanner}>
              <Text style={s.warningText}>This entry will be logged as unplanned work</Text>
            </View>
          )}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.primaryBtn} onPress={handleSaveManual}>
              <Text style={s.primaryBtnText}>Save Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={() => setShowManual(false)}>
              <Text style={s.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Time entries list */}
      <Text style={[s.sectionTitle, { marginTop: 20, marginHorizontal: 16 }]}>Time Entries</Text>
      {sections.map((section) => (
        <View key={section.title} style={s.section}>
          <Text style={s.dateHeader}>{section.title}</Text>
          {section.data.map((entry) => (
            <View key={entry.id} style={[s.entryRow, !entry.planned && s.entryRowUnplanned]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.entryProject}>{entry.project}</Text>
                <Text style={s.entryDesc}>{entry.description}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={s.entryHours}>{entry.hours}h</Text>
                {!entry.planned && <Text style={s.unplannedBadge}>Unplanned</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623', padding: 16, paddingBottom: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e6ed', gap: 12 },
  timer: { fontSize: 48, fontWeight: '700', color: '#0f1623', textAlign: 'center', fontVariant: ['tabular-nums'] },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, padding: 12, backgroundColor: '#f9fafb' },
  dropdownText: { fontSize: 14, color: '#0f1623' },
  dropdownList: { borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, backgroundColor: '#fff', marginTop: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 14, padding: 20, gap: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f1623' },
  input: { borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#f9fafb' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, color: '#4a5568' },
  toggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  toggleOn: { backgroundColor: '#dcfce7' },
  toggleOff: { backgroundColor: '#fef3c7' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#0f1623' },
  warningBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10 },
  warningText: { fontSize: 12, color: '#92400e', fontWeight: '500' },
  primaryBtn: { backgroundColor: '#1d6ecd', borderRadius: 8, paddingVertical: 12, alignItems: 'center', flex: 1 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ghostBtn: { borderWidth: 1, borderColor: '#e2e6ed', borderRadius: 8, paddingVertical: 12, alignItems: 'center', flex: 1 },
  ghostBtnText: { color: '#4a5568', fontWeight: '600', fontSize: 14 },
  manualToggle: { paddingHorizontal: 16, paddingVertical: 14 },
  manualToggleText: { color: '#1d6ecd', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f1623' },
  section: { marginHorizontal: 16, marginTop: 8 },
  dateHeader: { fontSize: 13, fontWeight: '600', color: '#9aa0ae', marginBottom: 6 },
  entryRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e6ed', marginBottom: 6, alignItems: 'center' },
  entryRowUnplanned: { borderLeftWidth: 3, borderLeftColor: '#d97706' },
  entryProject: { fontSize: 13, fontWeight: '600', color: '#0f1623' },
  entryDesc: { fontSize: 12, color: '#9aa0ae' },
  entryHours: { fontSize: 14, fontWeight: '700', color: '#0f1623' },
  unplannedBadge: { fontSize: 10, fontWeight: '600', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
