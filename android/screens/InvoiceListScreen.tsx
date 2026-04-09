import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { isDemoMode } from '../api/demoAdapter';
import { api } from '../api/client';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

interface LineItem {
  description: string;
  amount: number;
}

interface TimelineEvent {
  label: string;
  date: string | null;
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: InvoiceStatus;
  date: string;
  daysOverdue?: number;
  lineItems: LineItem[];
  timeline: TimelineEvent[];
}

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
  sent: { bg: '#dbeafe', color: '#1d6ecd', label: 'Sent' },
  paid: { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
  overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
};

const DEMO_INVOICES: Invoice[] = [
  {
    id: '1',
    number: 'INV-2025-001',
    client: 'Jordan Kim',
    amount: 2400,
    status: 'paid',
    date: '2025-05-15',
    lineItems: [
      { description: 'Brand strategy workshop', amount: 800 },
      { description: 'Logo design (3 concepts)', amount: 1200 },
      { description: 'Brand guidelines document', amount: 400 },
    ],
    timeline: [
      { label: 'Created', date: '2025-05-10' },
      { label: 'Sent', date: '2025-05-10' },
      { label: 'Viewed', date: '2025-05-11' },
      { label: 'Paid', date: '2025-05-15' },
    ],
  },
  {
    id: '2',
    number: 'INV-2025-002',
    client: 'Sam Okonkwo',
    amount: 1800,
    status: 'sent',
    date: '2025-06-01',
    lineItems: [
      { description: 'Website wireframes', amount: 1000 },
      { description: 'Responsive prototype', amount: 800 },
    ],
    timeline: [
      { label: 'Created', date: '2025-05-28' },
      { label: 'Sent', date: '2025-06-01' },
      { label: 'Viewed', date: '2025-06-02' },
      { label: 'Paid', date: null },
    ],
  },
  {
    id: '3',
    number: 'INV-2025-003',
    client: 'Riley Chen',
    amount: 3200,
    status: 'overdue',
    date: '2025-05-20',
    daysOverdue: 14,
    lineItems: [
      { description: 'Pitch deck design', amount: 1500 },
      { description: 'Illustration set (8 assets)', amount: 1200 },
      { description: 'Revision round', amount: 500 },
    ],
    timeline: [
      { label: 'Created', date: '2025-05-18' },
      { label: 'Sent', date: '2025-05-20' },
      { label: 'Viewed', date: '2025-05-22' },
      { label: 'Paid', date: null },
    ],
  },
  {
    id: '4',
    number: 'INV-2025-004',
    client: 'Jordan Kim',
    amount: 950,
    status: 'draft',
    date: '2025-06-04',
    lineItems: [
      { description: 'Social media templates (5)', amount: 750 },
      { description: 'Asset exports', amount: 200 },
    ],
    timeline: [
      { label: 'Created', date: '2025-06-04' },
      { label: 'Sent', date: null },
      { label: 'Viewed', date: null },
      { label: 'Paid', date: null },
    ],
  },
];

const FILTER_TABS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

export default function InvoiceListScreen() {
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(isDemoMode() ? DEMO_INVOICES : []);

  useEffect(() => {
    if (isDemoMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/invoices');
        if (!cancelled && Array.isArray(data)) setInvoices(data);
      } catch { /* backend unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = activeFilter === 'all'
    ? invoices
    : invoices.filter((inv) => inv.status === activeFilter);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>Invoices</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabsContent}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[s.tab, activeFilter === tab.value && s.tabActive]}
            onPress={() => setActiveFilter(tab.value)}
          >
            <Text style={[s.tabText, activeFilter === tab.value && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Text style={{ fontSize: 22, color: '#9aa0ae' }}>$</Text>
            </View>
            <Text style={s.emptyTitle}>No invoices</Text>
            <Text style={s.emptyDesc}>
              No {activeFilter !== 'all' ? activeFilter : ''} invoices to display.
            </Text>
          </View>
        ) : (
          filtered.map((inv) => {
            const expanded = expandedId === inv.id;
            const sty = STATUS_STYLE[inv.status];
            return (
              <TouchableOpacity
                key={inv.id}
                style={[s.invoiceRow, inv.status === 'overdue' && s.overdueBorder]}
                onPress={() => toggleExpand(inv.id)}
                activeOpacity={0.7}
              >
                <View style={s.invoiceHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.invoiceNumber}>{inv.number}</Text>
                    <Text style={s.invoiceClient}>{inv.client}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.invoiceAmount}>${inv.amount.toLocaleString()}</Text>
                    <View style={[s.badge, { backgroundColor: sty.bg }]}>
                      <Text style={[s.badgeText, { color: sty.color }]}>{sty.label}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.invoiceDate}>{inv.date}</Text>
                {inv.status === 'overdue' && inv.daysOverdue && (
                  <Text style={s.overdueText}>{inv.daysOverdue} days overdue</Text>
                )}

                {expanded && (
                  <View style={s.expandedSection}>
                    <Text style={s.sectionLabel}>Line Items</Text>
                    {inv.lineItems.map((item, i) => (
                      <View key={i} style={s.lineItemRow}>
                        <Text style={s.lineItemDesc}>{item.description}</Text>
                        <Text style={s.lineItemAmt}>${item.amount}</Text>
                      </View>
                    ))}
                    <View style={[s.lineItemRow, { borderTopWidth: 1, borderTopColor: '#e2e6ed', paddingTop: 8, marginTop: 4 }]}>
                      <Text style={[s.lineItemDesc, { fontWeight: '700' }]}>Total</Text>
                      <Text style={[s.lineItemAmt, { fontWeight: '700' }]}>${inv.amount.toLocaleString()}</Text>
                    </View>

                    <Text style={[s.sectionLabel, { marginTop: 14 }]}>Timeline</Text>
                    {inv.timeline.map((evt, i) => (
                      <View key={i} style={s.timelineRow}>
                        <View style={[s.timelineDot, evt.date ? s.timelineDotFilled : s.timelineDotEmpty]} />
                        <Text style={s.timelineLabel}>{evt.label}</Text>
                        <Text style={s.timelineDate}>{evt.date ?? '\u2014'}</Text>
                      </View>
                    ))}

                    <View style={s.actionRow}>
                      {inv.status !== 'paid' && (
                        <TouchableOpacity style={s.actionBtn}>
                          <Text style={s.actionBtnText}>Send Reminder</Text>
                        </TouchableOpacity>
                      )}
                      {inv.status !== 'paid' && (
                        <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]}>
                          <Text style={s.actionBtnPrimaryText}>Mark as Paid</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f1623', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  tabs: { flexGrow: 0, paddingHorizontal: 12 },
  tabsContent: { gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#e2e6ed', backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  tabText: { fontSize: 12, fontWeight: '500', color: '#4a5568' },
  tabTextActive: { color: '#fff' },
  list: { padding: 16, gap: 2 },
  invoiceRow: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e6ed', marginBottom: 8 },
  overdueBorder: { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 14, fontWeight: '700', color: '#0f1623' },
  invoiceClient: { fontSize: 12, color: '#4a5568' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: '#0f1623' },
  invoiceDate: { fontSize: 11, color: '#9aa0ae', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  overdueText: { fontSize: 12, fontWeight: '600', color: '#dc2626', marginTop: 4 },
  expandedSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0f1623', marginBottom: 8 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lineItemDesc: { fontSize: 13, color: '#4a5568' },
  lineItemAmt: { fontSize: 13, color: '#0f1623' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineDotFilled: { backgroundColor: '#16a34a' },
  timelineDotEmpty: { backgroundColor: '#e2e6ed' },
  timelineLabel: { fontSize: 13, color: '#4a5568', flex: 1 },
  timelineDate: { fontSize: 12, color: '#9aa0ae' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e6ed', alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#4a5568' },
  actionBtnPrimary: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  actionBtnPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0f1623', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#9aa0ae' },
});
