import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { fetchCampaignRecipients } from '../../services/marketingApi';
import StatusBadge from '../../components/marketing/StatusBadge';
import { SHADOW_SM } from '../../theme';
import type { Campaign, CampaignRecipient, RecipientStatus } from '../../types/marketing';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = {
  navigation: NativeStackNavigationProp<MarketingStackParamList, 'CampaignDetail'>;
  route: RouteProp<MarketingStackParamList, 'CampaignDetail'>;
};

type RecipientFilter = 'all' | RecipientStatus;
const RECIPIENT_FILTER_OPTIONS: { key: RecipientFilter; label: string }[] = [
  { key: 'all',          label: 'All Recipients' },
  { key: 'pending',      label: 'Pending' },
  { key: 'sent',         label: 'Sent' },
  { key: 'delivered',    label: 'Delivered' },
  { key: 'opened',       label: 'Opened' },
  { key: 'clicked',      label: 'Clicked' },
  { key: 'bounced',      label: 'Bounced' },
  { key: 'skipped',      label: 'Skipped' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
];

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function fmtDate(str: string) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function recipientName(r: CampaignRecipient) {
  if (!r.contact) return '—';
  const { firstName, lastName } = r.contact;
  return [firstName, lastName].filter(Boolean).join(' ') || r.contact.email;
}

// ── Funnel Bar ─────────────────────────────────────────────────────────────────

const FunnelBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const { C } = useAppTheme();
  const pctNum = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={funnelStyles.row}>
      <Text style={[funnelStyles.label, { color: C.textMuted }]}>{label}</Text>
      <View style={[funnelStyles.track, { backgroundColor: C.surface }]}>
        <View style={[funnelStyles.fill, { width: `${pctNum}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[funnelStyles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={[funnelStyles.pct, { color: C.textMuted }]}>{Math.round(pctNum)}%</Text>
    </View>
  );
};

const funnelStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', width: 68, letterSpacing: 0.2 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  value: { fontSize: 12, fontWeight: '800', width: 48, textAlign: 'right' },
  pct: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
});

// ── Recipient Row ─────────────────────────────────────────────────────────────

const RecipientRow = ({ item }: { item: CampaignRecipient }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const name = recipientName(item);
  const email = item.contact?.email ?? '—';
  const company = item.contact?.company ?? '';

  return (
    <View style={styles.recipRow}>
      <View style={styles.recipInitial}>
        <Text style={styles.recipInitialText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.recipBody}>
        <View style={styles.recipTop}>
          <Text style={styles.recipName} numberOfLines={1}>{name}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        <Text style={styles.recipEmail} numberOfLines={1}>{email}</Text>
        {company ? <Text style={styles.recipCompany} numberOfLines={1}>{company}</Text> : null}
        {(item.skipReason || item.unsubReason) && (
          <Text style={styles.recipReason} numberOfLines={1}>
            {item.skipReason || item.unsubReason}
          </Text>
        )}
      </View>
      {item.abVariant && (
        <View style={styles.variantBadge}>
          <Text style={styles.variantText}>{item.abVariant}</Text>
        </View>
      )}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CampaignDetailScreen({ navigation, route }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [campaign, setCampaign] = useState<Campaign>(route.params.campaign);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecipientFilter>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [view, setView] = useState<'recipients' | 'analytics'>('analytics');

  const PER_PAGE = 30;

  async function loadRecipients(newPage = 1, q = search, status = statusFilter) {
    setRecipientsLoading(true);
    const res = await fetchCampaignRecipients(campaign.id, {
      page: newPage, limit: PER_PAGE, search: q,
      ...(status !== 'all' ? { status } : {}),
    });
    setRecipients(res.data);
    setRecipientTotal(res.total);
    setPage(newPage);
    setRecipientsLoading(false);
  }

  useEffect(() => { loadRecipients(1); }, []);

  function handleSearch(q: string) {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadRecipients(1, q), 400);
  }

  function handleStatusFilter(s: RecipientFilter) {
    setStatusFilter(s);
    setFilterModalVisible(false);
    loadRecipients(1, search, s);
  }

  const totalPages = Math.ceil(recipientTotal / PER_PAGE);
  const showStart = recipientTotal === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const showEnd = Math.min(page * PER_PAGE, recipientTotal);

  const c = campaign;
  const sent = c.sentCount ?? 0;
  const recip = c.recipientsCount ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: CampaignRecipient }) => <RecipientRow item={item} />,
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>{c.name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {c.type === 'ab_test' ? 'A/B Test · ' : ''}{c.fromEmail || c.fromName || ''}
          </Text>
        </View>
        <StatusBadge status={c.status} size="sm" />
      </View>


      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'analytics' && styles.toggleBtnActive]}
          onPress={() => setView('analytics')}
        >
          <Ionicons name="bar-chart-outline" size={14} color={view === 'analytics' ? C.primary : C.textMuted} />
          <Text style={[styles.toggleBtnText, view === 'analytics' && { color: C.primary }]}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'recipients' && styles.toggleBtnActive]}
          onPress={() => { setView('recipients'); loadRecipients(1); }}
        >
          <Ionicons name="people-outline" size={14} color={view === 'recipients' ? C.primary : C.textMuted} />
          <Text style={[styles.toggleBtnText, view === 'recipients' && { color: C.primary }]}>
            Recipients
            {recipientTotal > 0 ? ` (${recipientTotal})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {view === 'analytics' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Campaign info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={14} color={C.textMuted} />
              <Text style={styles.infoLabel}>Subject</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{c.subject || c.template?.subject || '—'}</Text>
            </View>
            {c.template && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color={C.textMuted} />
                <Text style={styles.infoLabel}>Template</Text>
                <Text style={styles.infoValue}>{c.template.name}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={C.textMuted} />
              <Text style={styles.infoLabel}>From</Text>
              <Text style={styles.infoValue}>{[c.fromName, c.fromEmail].filter(Boolean).join(' · ') || '—'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{fmtDate(c.createdAt)}</Text>
            </View>
          </View>

          {/* Funnel */}
          <Text style={styles.sectionTitle}>Engagement Funnel</Text>
          <View style={styles.funnelCard}>
            <FunnelBar label="Sent"      value={sent}                   total={recip} color={C.primary} />
            <FunnelBar label="Delivered" value={c.deliveredCount ?? 0}  total={sent}  color={C.success} />
            <FunnelBar label="Opened"    value={c.openedCount ?? 0}     total={sent}  color="#8b5cf6" />
            <FunnelBar label="Clicked"   value={c.clickedCount ?? 0}    total={sent}  color="#f59e0b" />
            <FunnelBar label="Bounced"   value={c.bouncedCount ?? 0}    total={sent}  color={C.error} />
            <FunnelBar label="Unsub"     value={c.unsubscribedCount ?? 0} total={sent} color="#f97316" />
          </View>

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      ) : (
        <View style={styles.recipientsWrap}>
          {/* Search + filter */}
          <View style={styles.recipSearchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {!!search && (
                <TouchableOpacity onPress={() => { setSearch(''); loadRecipients(1, ''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.recipFilterBtn, statusFilter !== 'all' && styles.recipFilterBtnActive]}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="funnel-outline" size={14} color={statusFilter === 'all' ? C.textMuted : C.primary} />
              <Ionicons name="chevron-down" size={11} color={statusFilter === 'all' ? C.textMuted : C.primary} />
            </TouchableOpacity>
          </View>

          {recipientTotal > 0 && (
            <Text style={styles.paginationInfo}>
              Showing {showStart}–{showEnd} of {recipientTotal.toLocaleString()}
              {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            </Text>
          )}

          {recipientsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : (
            <FlatList
              data={recipients}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={44} color={C.textDim} />
                  <Text style={styles.emptyTitle}>No recipients found</Text>
                </View>
              }
              ListFooterComponent={
                totalPages > 1 ? (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                      onPress={() => page > 1 && loadRecipients(page - 1)}
                      disabled={page <= 1}
                    >
                      <Ionicons name="chevron-back" size={15} color={page <= 1 ? C.textDim : C.primary} />
                      <Text style={[styles.pageBtnText, page <= 1 && { color: C.textDim }]}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageInfo}>Page {page} / {totalPages}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                      onPress={() => page < totalPages && loadRecipients(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <Text style={[styles.pageBtnText, page >= totalPages && { color: C.textDim }]}>Next</Text>
                      <Ionicons name="chevron-forward" size={15} color={page >= totalPages ? C.textDim : C.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}

      {/* Recipient status filter modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHandle} />
            <Text style={styles.filterSheetTitle}>Filter by Status</Text>
            {RECIPIENT_FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.filterOption}
                  onPress={() => handleStatusFilter(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>{opt.label}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useAppTheme>['C']) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  headerBody: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  actionsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  viewToggle: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  toggleBtnActive: { backgroundColor: C.primaryDim },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: C.textMuted },

  infoCard: { marginHorizontal: 14, marginBottom: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, ...SHADOW_SM },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder, gap: 8 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, width: 64 },
  infoValue: { flex: 1, fontSize: 12, color: C.text, lineHeight: 17 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 14, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginBottom: 16 },
  statGridItem: { width: '47%', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, borderTopWidth: 3, paddingHorizontal: 12, paddingVertical: 12, ...SHADOW_SM },
  statGridValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  statGridLabel: { fontSize: 11, color: C.textMuted, marginTop: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statGridPct: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  funnelCard: { marginHorizontal: 14, marginBottom: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 16, ...SHADOW_SM },

  recipientsWrap: { flex: 1 },
  recipSearchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 6, gap: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  recipFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 12, height: 42 },
  recipFilterBtnActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  paginationInfo: { fontSize: 11, color: C.textMuted, paddingHorizontal: 14, marginBottom: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderColor: C.cardBorder },
  filterSheetHandle: { width: 36, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  filterSheetTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder, gap: 10 },
  filterOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
  filterOptionTextActive: { color: C.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingBottom: 40 },

  recipRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, padding: 12, marginBottom: 8, gap: 10, ...SHADOW_SM },
  recipInitial: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recipInitialText: { fontSize: 15, fontWeight: '800', color: C.primaryLight },
  recipBody: { flex: 1, minWidth: 0 },
  recipTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  recipName: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  recipEmail: { fontSize: 11, color: C.textMuted },
  recipCompany: { fontSize: 11, color: C.textSub, marginTop: 1 },
  recipReason: { fontSize: 10, color: C.error, marginTop: 2 },
  variantBadge: { backgroundColor: 'rgba(139,92,246,0.18)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  variantText: { fontSize: 11, fontWeight: '800', color: '#8b5cf6' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textSub },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.card },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  pageInfo: { fontSize: 12, color: C.textMuted },
}); }
