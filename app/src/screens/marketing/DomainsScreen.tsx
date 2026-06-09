import { useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchDomains } from '../../services/marketingApi';
import StatusBadge from '../../components/marketing/StatusBadge';
import { SHADOW_SM } from '../../theme';
import type { Domain, DomainStatus } from '../../types/marketing';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = { navigation: NativeStackNavigationProp<MarketingStackParamList, 'MarketingHome'> };
type StatusFilter = 'all' | DomainStatus;

const AUTO_REFRESH_MS = 30_000;

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'All Domains' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending',  label: 'Pending' },
  { key: 'failed',   label: 'Failed' },
];

function formatDate(str: string) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgoSec(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 2) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ─── Domain Row ──────────────────────────────────────────────────────────────

const DomainRow = ({ item, onPress }: { item: Domain; onPress: () => void }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const statusColor =
    item.status === 'verified' ? C.success :
    item.status === 'pending'  ? '#f59e0b' : C.error;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.rowIcon, { backgroundColor: `${statusColor}18` }]}>
        <Ionicons name="globe-outline" size={18} color={statusColor} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{item.domainName}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        {item.defaultFromEmail ? (
          <Text style={styles.rowFrom} numberOfLines={1}>
            <Text style={styles.rowFromLabel}>From: </Text>
            {item.defaultFromEmail}
          </Text>
        ) : null}
        <Text style={styles.rowDate}>Added {formatDate(item.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
    </TouchableOpacity>
  );
};

// ─── Filter Modal ─────────────────────────────────────────────────────────────

const FilterModal = ({
  visible, onClose, filter, setFilter, counts,
}: {
  visible: boolean; onClose: () => void;
  filter: StatusFilter; setFilter: (f: StatusFilter) => void;
  counts: { total: number; verified: number; pending: number; failed: number };
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
            const cnt = opt.key === 'all' ? counts.total : (counts[opt.key as keyof typeof counts] ?? 0);
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

export default function DomainsScreen({ navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { activeClientId } = useActiveClient();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [lastSync, setLastSync] = useState(Date.now());
  const [lastSyncDisplay, setLastSyncDisplay] = useState('just now');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

  async function load(mode: 'init' | 'refresh' | 'auto' = 'init') {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'init') setLoading(true);
    const data = await fetchDomains(activeClientId);
    setDomains(data);
    const now = Date.now();
    setLastSync(now);
    setLastSyncDisplay('just now');
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load('init');
    timerRef.current = setInterval(() => load('auto'), AUTO_REFRESH_MS);
    displayRef.current = setInterval(() => {
      setLastSyncDisplay(timeAgoSec(Date.now() - lastSyncRef.current));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (displayRef.current) clearInterval(displayRef.current);
    };
  }, [activeClientId]);

  const filtered = useMemo(() => {
    let list = domains;
    if (statusFilter !== 'all') list = list.filter((d) => d.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.domainName.toLowerCase().includes(q) ||
        d.defaultFromEmail.toLowerCase().includes(q),
      );
    }
    return list;
  }, [domains, search, statusFilter]);

  const counts = useMemo(() => ({
    total:    domains.length,
    verified: domains.filter((d) => d.status === 'verified').length,
    pending:  domains.filter((d) => d.status === 'pending').length,
    failed:   domains.filter((d) => d.status === 'failed').length,
  }), [domains]);

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? 'All Domains';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Domains</Text>
        <Text style={styles.headerSub}>{counts.total} total · SPF, DKIM & DMARC</Text>
      </View>

      {/* Metrics strip */}
      <View style={styles.metricsStrip}>
        {[
          { label: 'Total',    value: counts.total,    color: C.textSub },
          { label: 'Verified', value: counts.verified, color: C.success },
          { label: 'Pending',  value: counts.pending,  color: '#f59e0b' },
          { label: 'Failed',   value: counts.failed,   color: C.error },
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
            placeholder="Search domains..."
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
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading domains…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listEmpty]}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          renderItem={({ item }) => (
            <DomainRow item={item} onPress={() => navigation.navigate('DomainDetail', { domain: item })} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="globe-outline" size={48} color={C.textDim} />
              <Text style={styles.emptyTitle}>No domains found</Text>
              <Text style={styles.emptyMsg}>
                {search ? `No results for "${search}"` : statusFilter !== 'all' ? `No ${statusFilter} domains.` : 'No domains for this client.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            domains.length > 0 ? (
              <View style={styles.footer}>
                <View style={[styles.footerDot, { backgroundColor: C.success }]} />
                <Text style={styles.footerText}>Auto-refreshes every 30s · last sync {lastSyncDisplay}</Text>
              </View>
            ) : null
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
  filterResultCount: { flex: 1, fontSize: 12, color: C.textMuted, textAlign: 'right' },

  listContent: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },

  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 10, gap: 12, ...SHADOW_SM },
  rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  rowFrom: { fontSize: 11, color: C.textMuted, marginBottom: 3 },
  rowFromLabel: { fontWeight: '700' },
  rowDate: { fontSize: 10, color: C.textDim },

  loadingText: { color: C.textMuted, fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { color: C.textSub, fontSize: 17, fontWeight: '700' },
  emptyMsg: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerText: { fontSize: 11, color: C.textMuted },

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
