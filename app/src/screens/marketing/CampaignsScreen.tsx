import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import { useActiveClient } from '../../context/ActiveClientContext';
import { fetchCampaigns } from '../../services/marketingApi';
import StatusBadge from '../../components/marketing/StatusBadge';
import { SHADOW_SM } from '../../theme';
import type { Campaign, CampaignStatus } from '../../types/marketing';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = {
  navigation: NativeStackNavigationProp<MarketingStackParamList, 'MarketingHome'>;
};

type FilterTab = 'all' | CampaignStatus;
const FILTER_OPTIONS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All Campaigns' },
  { key: 'sent',     label: 'Sent' },
  { key: 'sending',  label: 'Sending' },
  { key: 'draft',    label: 'Draft' },
  { key: 'paused',   label: 'Paused' },
  { key: 'canceled', label: 'Canceled' },
];

function fmtDate(str: string) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────

const CampaignRow = ({ item, onPress }: { item: Campaign; onPress: () => void }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const isAbTest = item.type === 'ab_test';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowIcon}>
        <Ionicons name={isAbTest ? 'flask-outline' : 'mail-outline'} size={18} color={C.primary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.rowTitleGroup}>
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            {isAbTest && (
              <View style={styles.abBadge}>
                <Text style={styles.abText}>A/B</Text>
              </View>
            )}
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>
        {item.template && (
          <Text style={styles.rowTemplate} numberOfLines={1}>
            <Text style={styles.rowTemplateLabel}>Template: </Text>
            {item.template.name}
          </Text>
        )}
        <Text style={styles.rowSubject} numberOfLines={1}>{item.subject || item.template?.subject || '—'}</Text>
        <View style={styles.rowMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={11} color={C.textMuted} />
            <Text style={styles.metaText}>{(item.recipientsCount ?? 0).toLocaleString()}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="send-outline" size={11} color={C.textMuted} />
            <Text style={styles.metaText}>{(item.sentCount ?? 0).toLocaleString()}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="eye-outline" size={11} color={C.textMuted} />
            <Text style={styles.metaText}>{(item.openedCount ?? 0).toLocaleString()}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="hand-left-outline" size={11} color={C.textMuted} />
            <Text style={styles.metaText}>{(item.clickedCount ?? 0).toLocaleString()}</Text>
          </View>
          <Text style={styles.metaDate}>{fmtDate(item.createdAt)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={15} color={C.textMuted} style={{ marginTop: 2 }} />
    </TouchableOpacity>
  );
};

// ─── Filter Dropdown Modal ────────────────────────────────────────────────────

const FilterModal = ({
  visible, onClose, filter, setFilter, counts,
}: {
  visible: boolean;
  onClose: () => void;
  filter: FilterTab;
  setFilter: (f: FilterTab) => void;
  counts: Record<string, number>;
}) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHandle} />
          <Text style={styles.filterSheetTitle}>Filter by Status</Text>
          {FILTER_OPTIONS.map((opt) => {
            const cnt = opt.key === 'all' ? counts.total : (counts[opt.key] ?? 0);
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterOption, active && styles.filterOptionActive]}
                onPress={() => { setFilter(opt.key); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>{opt.label}</Text>
                {cnt > 0 && (
                  <View style={[styles.filterOptionBadge, active && styles.filterOptionBadgeActive]}>
                    <Text style={[styles.filterOptionBadgeText, active && styles.filterOptionBadgeTextActive]}>{cnt}</Text>
                  </View>
                )}
                {active && <Ionicons name="checkmark" size={16} color={C.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CampaignsScreen({ navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { activeClientId } = useActiveClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  async function load(mode: 'init' | 'refresh' = 'init') {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    const data = await fetchCampaigns(activeClientId);
    setCampaigns(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load('init'); }, [activeClientId]);

  const filtered = useMemo(() => {
    let list = campaigns;
    if (filter !== 'all') list = list.filter((c) => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.subject ?? '').toLowerCase().includes(q) ||
          (c.template?.name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [campaigns, filter, search]);

  const counts = useMemo(() => ({
    total:    campaigns.length,
    sending:  campaigns.filter((c) => c.status === 'sending').length,
    sent:     campaigns.filter((c) => c.status === 'sent').length,
    draft:    campaigns.filter((c) => c.status === 'draft').length,
    paused:   campaigns.filter((c) => c.status === 'paused').length,
    canceled: campaigns.filter((c) => c.status === 'canceled').length,
  }), [campaigns]);

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.key === filter)?.label ?? 'All';
  const activeFilterCount = filter === 'all' ? counts.total : (counts[filter as keyof typeof counts] ?? 0);

  const renderItem = useCallback(
    ({ item }: { item: Campaign }) => (
      <CampaignRow item={item} onPress={() => navigation.navigate('CampaignDetail', { campaign: item })} />
    ),
    [navigation],
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campaigns</Text>
        <Text style={styles.headerSub}>{counts.total} total</Text>
      </View>

      {/* Metrics strip */}
      <View style={styles.metricsStrip}>
        {[
          { label: 'Total',   value: counts.total,    color: C.textSub },
          { label: 'Sent',    value: counts.sent,     color: C.success },
          { label: 'Sending', value: counts.sending,  color: '#f59e0b' },
          { label: 'Draft',   value: counts.draft,    color: C.textMuted },
          { label: 'Paused',  value: counts.paused,   color: C.warning },
        ].map((s, i) => (
          <View key={s.label} style={[styles.metricItem, i > 0 && styles.metricSep]}>
            <Text style={[styles.metricVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.metricLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + Filter in one row */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, filter !== 'all' && styles.filterBtnActive]} onPress={() => setFilterModalVisible(true)} activeOpacity={0.75}>
          <Ionicons name="funnel-outline" size={14} color={filter === 'all' ? C.textMuted : C.primary} />
          <Ionicons name="chevron-down" size={11} color={filter === 'all' ? C.textMuted : C.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading campaigns…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listEmpty]}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="megaphone-outline" size={48} color={C.textDim} />
              <Text style={styles.emptyTitle}>No campaigns found</Text>
              <Text style={styles.emptyMsg}>
                {search ? `No results for "${search}"` : filter !== 'all' ? `No ${filter} campaigns.` : 'No campaigns for this client.'}
              </Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
      />
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useAppTheme>['C']) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  headerSub: { flex: 1, fontSize: 12, color: C.textMuted },

  metricsStrip: { flexDirection: 'row', backgroundColor: C.card, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10, ...SHADOW_SM },
  metricItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  metricSep: { borderLeftWidth: 1, borderLeftColor: C.cardBorder },
  metricVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },

  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 12, height: 42 },
  filterBtnActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  filterBtnBadge: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  filterBtnBadgeText: { fontSize: 10, fontWeight: '800', color: C.white },
  filterResultCount: { flex: 1, fontSize: 12, color: C.textMuted, textAlign: 'right' },

  listContent: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },

  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 10, gap: 12, ...SHADOW_SM },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  rowTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  abBadge: { backgroundColor: 'rgba(139,92,246,0.18)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  abText: { fontSize: 9, fontWeight: '800', color: '#8b5cf6' },
  rowTemplate: { fontSize: 11, color: C.textMuted, marginBottom: 1 },
  rowTemplateLabel: { fontWeight: '700' },
  rowSubject: { fontSize: 12, color: C.textSub, marginBottom: 8 },
  rowMeta: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: C.textMuted },
  metaDate: { fontSize: 10, color: C.textDim, marginLeft: 'auto' },

  loadingText: { color: C.textMuted, fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { color: C.textSub, fontSize: 17, fontWeight: '700' },
  emptyMsg: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },

  // Filter Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderColor: C.cardBorder },
  filterSheetHandle: { width: 36, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  filterSheetTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder, gap: 10 },
  filterOptionActive: { },
  filterOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
  filterOptionTextActive: { color: C.primary, fontWeight: '700' },
  filterOptionBadge: { backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  filterOptionBadgeActive: { backgroundColor: C.primaryDim },
  filterOptionBadgeText: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  filterOptionBadgeTextActive: { color: C.primary },
}); }
