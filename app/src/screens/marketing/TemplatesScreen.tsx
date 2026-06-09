import { useEffect, useMemo, useState } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../context/ThemeContext';
import { useActiveClient } from '../../context/ActiveClientContext';
import { fetchTemplates } from '../../services/marketingApi';
import StatusBadge from '../../components/marketing/StatusBadge';
import { SHADOW_SM } from '../../theme';
import type { Template, TemplateStatus } from '../../types/marketing';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = { navigation: NativeStackNavigationProp<MarketingStackParamList, 'MarketingHome'> };
type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | TemplateStatus;

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All Templates' },
  { key: 'published', label: 'Published' },
  { key: 'draft',     label: 'Drafts' },
];

function formatDate(str: string) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Template Card (grid) ─────────────────────────────────────────────────────

const TemplateCard = ({ item, onPress }: { item: Template; onPress: () => void }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const accentColor = item.status === 'published' ? C.success : C.warning;
  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.gridPreview, { borderBottomWidth: 1, borderBottomColor: C.cardBorder }]}>
        <View style={[styles.gridPreviewIcon, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name="document-text-outline" size={22} color={accentColor} />
        </View>
        <View style={styles.gridPreviewLines}>
          <View style={[styles.gridPreviewLine, { backgroundColor: C.cardBorder, width: '80%' }]} />
          <View style={[styles.gridPreviewLine, { backgroundColor: C.cardBorder, width: '60%' }]} />
          <View style={[styles.gridPreviewLine, { backgroundColor: C.cardBorder, width: '70%' }]} />
        </View>
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
        {item.subject ? <Text style={styles.gridSubject} numberOfLines={1}>{item.subject}</Text> : null}
        <View style={styles.gridMeta}>
          <StatusBadge status={item.status} size="sm" />
          <Text style={styles.gridDate}>{formatDate(item.updatedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Template Row (list) ──────────────────────────────────────────────────────

const TemplateRow = ({ item, onPress }: { item: Template; onPress: () => void }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={styles.listRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.listRowIcon}>
        <Ionicons name="document-text-outline" size={16} color={C.primary} />
      </View>
      <View style={styles.listRowBody}>
        <Text style={styles.listRowName} numberOfLines={1}>{item.name}</Text>
        {item.subject ? <Text style={styles.listRowSubject} numberOfLines={1}>{item.subject}</Text> : null}
        <Text style={styles.listRowDate}>{formatDate(item.updatedAt)}</Text>
      </View>
      <StatusBadge status={item.status} size="sm" />
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
};

// ─── Filter Modal ─────────────────────────────────────────────────────────────

const FilterModal = ({
  visible, onClose, filter, setFilter, counts,
}: {
  visible: boolean; onClose: () => void;
  filter: StatusFilter; setFilter: (f: StatusFilter) => void;
  counts: { total: number; published: number; draft: number };
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
            const cnt = opt.key === 'all' ? counts.total : opt.key === 'published' ? counts.published : counts.draft;
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={styles.filterOption}
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

export default function TemplatesScreen({ navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { activeClientId } = useActiveClient();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  async function load(mode: 'init' | 'refresh' = 'init') {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    const data = await fetchTemplates(activeClientId);
    setTemplates(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load('init'); }, [activeClientId]);

  const filtered = useMemo(() => {
    let list = templates;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [templates, search, statusFilter]);

  const counts = useMemo(() => ({
    total:     templates.length,
    published: templates.filter((t) => t.status === 'published').length,
    draft:     templates.filter((t) => t.status === 'draft').length,
  }), [templates]);

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? 'All Templates';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Templates</Text>
        <Text style={styles.headerSub}>{counts.total} total</Text>
      </View>

      {/* Metrics strip */}
      <View style={styles.metricsStrip}>
        {[
          { label: 'Total',     value: counts.total,     color: C.textSub },
          { label: 'Published', value: counts.published, color: C.success },
          { label: 'Drafts',    value: counts.draft,     color: C.warning },
        ].map((s, i) => (
          <View key={s.label} style={[styles.metricItem, i > 0 && styles.metricSep]}>
            <Text style={[styles.metricVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.metricLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + Filter + View toggle in one row */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
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
        <TouchableOpacity style={[styles.filterBtn, statusFilter !== 'all' && styles.filterBtnActive]} onPress={() => setFilterModalVisible(true)} activeOpacity={0.75}>
          <Ionicons name="funnel-outline" size={14} color={statusFilter === 'all' ? C.textMuted : C.primary} />
          <Ionicons name="chevron-down" size={11} color={statusFilter === 'all' ? C.textMuted : C.primary} />
        </TouchableOpacity>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={15} color={viewMode === 'grid' ? C.primary : C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list-outline" size={15} color={viewMode === 'list' ? C.primary : C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading templates…</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.gridContent, filtered.length === 0 && styles.listEmpty]}
          columnWrapperStyle={styles.gridRow}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          renderItem={({ item }) => <TemplateCard item={item} onPress={() => navigation.navigate('TemplateDetail', { template: item })} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color={C.textDim} />
              <Text style={styles.emptyTitle}>No templates found</Text>
              <Text style={styles.emptyMsg}>
                {search ? `No results for "${search}"` : statusFilter !== 'all' ? `No ${statusFilter} templates.` : 'No templates for this client.'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="list"
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listEmpty]}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          renderItem={({ item }) => <TemplateRow item={item} onPress={() => navigation.navigate('TemplateDetail', { template: item })} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color={C.textDim} />
              <Text style={styles.emptyTitle}>No templates found</Text>
              <Text style={styles.emptyMsg}>
                {search ? `No results for "${search}"` : statusFilter !== 'all' ? `No ${statusFilter} templates.` : 'No templates for this client.'}
              </Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filter={statusFilter}
        setFilter={setStatusFilter}
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

  metricsStrip: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, ...SHADOW_SM },
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
  filterResultCount: { flex: 1, fontSize: 12, color: C.textMuted, textAlign: 'center' },
  viewToggle: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', height: 42 },
  viewBtn: { width: 38, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: C.primaryDim },

  gridContent: { paddingHorizontal: 16, paddingBottom: 24 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', ...SHADOW_SM },
  gridPreview: { height: 96, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  gridPreviewIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  gridPreviewLines: { flex: 1, gap: 5 },
  gridPreviewLine: { height: 5, borderRadius: 3 },
  gridInfo: { padding: 11 },
  gridName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  gridSubject: { fontSize: 10, color: C.textMuted, marginBottom: 5 },
  gridMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridDate: { fontSize: 9, color: C.textMuted },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, padding: 12, marginBottom: 8, gap: 10, ...SHADOW_SM },
  listRowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  listRowBody: { flex: 1 },
  listRowName: { fontSize: 14, fontWeight: '700', color: C.text },
  listRowSubject: { fontSize: 11, color: C.textSub, marginTop: 1 },
  listRowDate: { fontSize: 10, color: C.textMuted, marginTop: 1 },

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
  filterOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
  filterOptionTextActive: { color: C.primary, fontWeight: '700' },
  filterOptionBadge: { backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  filterOptionBadgeActive: { backgroundColor: C.primaryDim },
  filterOptionBadgeText: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  filterOptionBadgeTextActive: { color: C.primary },
}); }
