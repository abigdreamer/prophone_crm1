import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchContacts, type ContactsQuery } from '../services/api';
import { useActiveClient } from '../context/ActiveClientContext';
import type { Contact } from '../types/contact';
import type { Client } from '../types/client';
import { SHADOW_SM, stageColors } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import type { ContactsStackParamList } from '../navigation/ContactsStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<ContactsStackParamList, 'ContactsList'>;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SORT_OPTIONS = [
  { value: 'company_az',  label: 'Company A → Z' },
  { value: 'company_za',  label: 'Company Z → A' },
  { value: 'lastname_az', label: 'Name A → Z' },
  { value: 'lastname_za', label: 'Name Z → A' },
  { value: 'score_desc',  label: 'Score: High → Low' },
  { value: 'score_asc',   label: 'Score: Low → High' },
  { value: 'recent',      label: 'Recent Activity' },
  { value: 'old',         label: 'Oldest Activity' },
  { value: 'value',       label: 'Contract Value: High → Low' },
  { value: 'trucks',      label: 'Fleet Size: High → Low' },
];


const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const DEFAULT_SORT = 'company_az';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(c: Contact) {
  const full = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  return full || c.company || '—';
}

function sortKey(c: Contact) {
  return (c.lastName || c.firstName || c.company || '').toUpperCase();
}

function initials(c: Contact): string {
  const f = c.firstName?.[0] ?? '';
  const l = c.lastName?.[0] ?? '';
  if (f || l) return (f + l).toUpperCase();
  return c.company?.[0]?.toUpperCase() ?? '?';
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `${mos}mo ago`;
  return `${Math.floor(mos / 12)}y ago`;
}

// ─── Contact Card ────────────────────────────────────────────────────────────

const ContactCard = ({
  item,
  onPress,
}: {
  item: Contact;
  onPress: () => void;
}) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const stage = stageColors(item.lifecycleStage);
  const ini = initials(item);
  const name = displayName(item);
  const addr = [item.city, item.state].filter(Boolean).join(', ');
  const ago = timeAgo(item.lastActivityAt);
  const score = Math.min(100, Math.max(0, item.leadScore ?? 0));
  const scoreColor = score >= 70 ? C.success : score >= 40 ? C.warning : C.error;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{ini}</Text>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Name + Stage */}
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <View style={[styles.stagePill, { backgroundColor: stage.bg }]}>
            <Text style={[styles.stageText, { color: stage.color }]}>
              {item.lifecycleStage}
            </Text>
          </View>
        </View>

        {/* Company (if name != company) */}
        {!!item.company && name !== item.company && (
          <Text style={styles.cardCompany} numberOfLines={1}>{item.company}</Text>
        )}

        {/* Address / Phone */}
        <View style={styles.metaRow}>
          {!!addr && (
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={11} color={C.textMuted} />
              <Text style={styles.metaChipText}>{addr}</Text>
            </View>
          )}
          {!!item.phone && (
            <View style={styles.metaChip}>
              <Ionicons name="call-outline" size={11} color={C.textMuted} />
              <Text style={styles.metaChipText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {/* Score bar */}
        <View style={styles.scoreBar}>
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, { width: `${score}%` as any, backgroundColor: scoreColor }]} />
          </View>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          {!!ago && <Text style={styles.agoText}>{ago}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Client Switcher ─────────────────────────────────────────────────────────

const ClientSwitcher = ({
  clients,
  activeId,
  onSelect,
}: {
  clients: Client[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  if (clients.length === 0) return null;

  const activeClient = clients.find((c) => c.id === activeId);
  const activeLabel = activeId ? (activeClient?.name ?? 'Client') : 'All Contacts';
  const sortedClients = activeId
    ? [clients.find((c) => c.id === activeId)!, ...clients.filter((c) => c.id !== activeId)]
    : clients;

  return (
    <View style={styles.switcherContainer}>
      {/* Active pool indicator header */}
      <View style={styles.switcherHeader}>
        <View style={styles.switcherHeaderLeft}>
          <Ionicons name="business-outline" size={13} color={C.primary} />
          <Text style={styles.switcherHeaderLabel}>POOL</Text>
        </View>
        <View style={styles.switcherActiveBadge}>
          <View style={styles.switcherActiveDot} />
          <Text style={styles.switcherActiveText} numberOfLines={1}>{activeLabel}</Text>
        </View>
      </View>

      {/* Scrollable pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.switcherContent}
      >
        {sortedClients.map((cl) => {
          const active = cl.id === activeId;
          return (
            <TouchableOpacity
              key={cl.id}
              style={[styles.switcherPill, active && styles.switcherPillActive]}
              onPress={() => onSelect(cl.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="business-outline"
                size={12}
                color={active ? C.primaryLight : C.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.switcherLabel, active && styles.switcherLabelActive]} numberOfLines={1}>
                {cl.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ─── Sort Sheet ───────────────────────────────────────────────────────────────

const SortSheet = ({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Sort By</Text>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.sheetRow}
            onPress={() => { onSelect(opt.value); onClose(); }}
            activeOpacity={0.65}
          >
            <Text style={[styles.sheetRowLabel, current === opt.value && styles.sheetRowActive]}>
              {opt.label}
            </Text>
            {current === opt.value && (
              <Ionicons name="checkmark" size={18} color={C.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
};

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

const FilterSheet = ({
  visible,
  activeStages,
  activeScoreMin,
  activeScoreMax,
  onApply,
  onClose,
}: {
  visible: boolean;
  activeStages: string[];
  activeScoreMin: number;
  activeScoreMax: number;
  onApply: (stages: string[], scoreMin: number, scoreMax: number) => void;
  onClose: () => void;
}) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [localStages, setLocalStages] = useState<string[]>(activeStages);
  const [localScoreMin, setLocalScoreMin] = useState(String(activeScoreMin));
  const [localScoreMax, setLocalScoreMax] = useState(String(activeScoreMax));

  useEffect(() => {
    if (visible) {
      setLocalStages(activeStages);
      setLocalScoreMin(String(activeScoreMin));
      setLocalScoreMax(String(activeScoreMax));
    }
  }, [visible]);

  function toggleStage(s: string) {
    setLocalStages((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function applyFilters() {
    const min = Math.max(0, Math.min(100, parseInt(localScoreMin) || 0));
    const max = Math.max(0, Math.min(100, parseInt(localScoreMax) || 100));
    onApply(localStages, min, Math.max(min, max));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Filter Contacts</Text>

        <Text style={styles.filterSectionLabel}>Lifecycle Stage</Text>
        <View style={styles.stagePillsRow}>
          {STAGES.map((s) => {
            const sc = stageColors(s);
            const active = localStages.includes(s);
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.filterStagePill,
                  active
                    ? { backgroundColor: sc.bg, borderColor: sc.color }
                    : { backgroundColor: C.surfaceHigh, borderColor: C.cardBorder },
                ]}
                onPress={() => toggleStage(s)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterStageText, { color: active ? sc.color : C.textMuted }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Score Range */}
        <Text style={styles.filterSectionLabel}>Lead Score Range</Text>
        <View style={styles.scoreRangeRow}>
          <View style={styles.scoreRangeField}>
            <Text style={styles.scoreRangeLabel}>Min</Text>
            <TextInput
              style={styles.scoreRangeInput}
              value={localScoreMin}
              onChangeText={setLocalScoreMin}
              keyboardType="numeric"
              maxLength={3}
              placeholderTextColor={C.textMuted}
              placeholder="0"
            />
          </View>
          <View style={styles.scoreRangeSep} />
          <View style={styles.scoreRangeField}>
            <Text style={styles.scoreRangeLabel}>Max</Text>
            <TextInput
              style={styles.scoreRangeInput}
              value={localScoreMax}
              onChangeText={setLocalScoreMax}
              keyboardType="numeric"
              maxLength={3}
              placeholderTextColor={C.textMuted}
              placeholder="100"
            />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterReset}
            onPress={() => { setLocalStages([]); setLocalScoreMin('0'); setLocalScoreMax('100'); onApply([], 0, 100); onClose(); }}
          >
            <Text style={styles.filterResetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterApply}
            onPress={applyFilters}
          >
            <Text style={styles.filterApplyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ContactsScreen({ navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Contact>>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 1000;

  const { clients, activeClientId, setActiveClientId, loading: clientsLoading } = useActiveClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [activeStages, setActiveStages] = useState<string[]>([]);
  const [scoreMin, setScoreMin] = useState<number>(0);
  const [scoreMax, setScoreMax] = useState<number>(100);

  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const hasScoreFilter = scoreMin > 0 || scoreMax < 100;
  const hasFilters = activeStages.length > 0 || hasScoreFilter;
  const filterCount = activeStages.length + (hasScoreFilter ? 1 : 0);

  // ── Load contacts (page 1 = replace, page > 1 = append) ───────────────────

  async function load(query: ContactsQuery, mode: 'init' | 'search' | 'refresh' | 'silent' = 'silent', targetPage = 1) {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'init') setLoading(true);
    else if (mode === 'search') setSearching(true);
    setError(null);
    try {
      const result = await fetchContacts({ ...query, limit: PAGE_SIZE, page: targetPage });
      if (targetPage === 1) {
        setContacts(result.data);
      } else {
        setContacts((prev) => [...prev, ...result.data]);
      }
      setTotal(result.total);
      setPage(targetPage);
      setHasMore(result.data.length === PAGE_SIZE && (targetPage * PAGE_SIZE) < result.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
      setLoadingMore(false);
    }
  }

  function buildQuery(overrides: Partial<ContactsQuery> = {}): ContactsQuery {
    return {
      clientId: activeClientId,
      sortBy,
      ...(activeStages.length > 0 ? { stages: activeStages.join(',') } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(scoreMin > 0 ? { scoreMin } : {}),
      ...(scoreMax < 100 ? { scoreMax } : {}),
      ...overrides,
    };
  }

  // ── Mount: load contacts once context has resolved activeClientId ─────────

  useEffect(() => {
    if (!clientsLoading && activeClientId !== undefined) {
      load({ clientId: activeClientId, sortBy: DEFAULT_SORT, limit: PAGE_SIZE, page: 1 }, 'init', 1);
    }
  }, [activeClientId, clientsLoading]);

  // ── Refresh on focus (e.g. navigating back from create/edit) ──────────────

  const reloadRef = useRef<() => void>(() => {});
  reloadRef.current = () => {
    if (!clientsLoading && activeClientId !== undefined) {
      load(buildQuery(), 'silent', 1);
    }
  };
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) { firstFocusRef.current = false; return; }
      reloadRef.current();
    }, [])
  );

  // ── Infinite scroll ────────────────────────────────────────────────────────

  function handleLoadMore() {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(buildQuery(), 'silent', page + 1);
  }

  // ── Debounced search ───────────────────────────────────────────────────────

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(buildQuery({ search: text.trim() || undefined }), 'search', 1);
    }, 400);
  }

  function clearSearch() {
    setSearch('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    load(buildQuery({ search: undefined }), 'search', 1);
  }

  // ── Client switch ──────────────────────────────────────────────────────────

  function handleClientSelect(id: string | null) {
    setActiveClientId(id);
    setSearch('');
    load(buildQuery({ clientId: id, search: undefined }), 'silent', 1);
  }

  // ── Sort change ────────────────────────────────────────────────────────────

  function handleSortSelect(value: string) {
    setSortBy(value);
    load(buildQuery({ sortBy: value }), 'silent', 1);
  }

  // ── Filter apply ───────────────────────────────────────────────────────────

  function handleFilterApply(stages: string[], newScoreMin: number, newScoreMax: number) {
    setActiveStages(stages);
    setScoreMin(newScoreMin);
    setScoreMax(newScoreMax);
    load(buildQuery({
      stages: stages.length > 0 ? stages.join(',') : undefined,
      scoreMin: newScoreMin > 0 ? newScoreMin : undefined,
      scoreMax: newScoreMax < 100 ? newScoreMax : undefined,
    }), 'silent', 1);
  }

  // ── A-Z Sidebar ───────────────────────────────────────────────────────────

  const sectionIndexMap: Record<string, number> = {};
  contacts.forEach((c, i) => {
    const letter = sortKey(c)[0];
    if (letter && !(letter in sectionIndexMap)) sectionIndexMap[letter] = i;
  });

  const scrollToLetter = useCallback(
    (letter: string) => {
      const index = sectionIndexMap[letter];
      if (index != null) flatListRef.current?.scrollToIndex({ index, animated: true });
    },
    [sectionIndexMap],
  );

  const renderItem = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactCard
        item={item}
        onPress={() => navigation.navigate('ContactDetail', { contact: item })}
      />
    ),
    [navigation],
  );

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.statusText}>Loading leads…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={44} color={C.error} />
        <Text style={styles.errorTitle}>Could not load contacts</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(buildQuery(), 'init')}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerCount}>
            {total.toLocaleString()} total · {contacts.length.toLocaleString()} loaded
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('LeadForm', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Client Switcher */}
      <View style={styles.switcherWrap}>
        <ClientSwitcher clients={clients} activeId={activeClientId} onSelect={handleClientSelect} />
      </View>

      {/* Search + Sort + Filter row */}
      <View style={styles.toolbarRow}>
        {/* Search */}
        <View style={styles.searchWrap}>
          {searching
            ? <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 2 }} />
            : <Ionicons name="search-outline" size={16} color={C.textMuted} />}
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts…"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {!!search && !searching && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort button */}
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowSort(true)} activeOpacity={0.75}>
          <Ionicons name="swap-vertical-outline" size={18} color={C.primary} />
        </TouchableOpacity>

        {/* Filter button */}
        <TouchableOpacity
          style={[styles.toolBtn, hasFilters && styles.toolBtnActive]}
          onPress={() => setShowFilter(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="options-outline" size={18} color={hasFilters ? C.white : C.primary} />
          {hasFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active sort + filter summary */}
      <View style={styles.summaryRow}>
        <Ionicons name="swap-vertical-outline" size={12} color={C.textMuted} style={{ marginRight: 4 }} />
        <Text style={styles.summaryText}>{currentSortLabel}</Text>
        {hasFilters && (
          <>
            <Text style={styles.summarySep}>·</Text>
            <Ionicons name="funnel" size={12} color={C.primary} style={{ marginRight: 3 }} />
            <Text style={[styles.summaryText, { color: C.primaryLight }]}>
              {activeStages.join(', ')}
            </Text>
            <TouchableOpacity onPress={() => handleFilterApply([], 0, 100)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={14} color={C.textMuted} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* List + Sidebar */}
      <View style={styles.listArea}>
        <FlatList
          ref={flatListRef}
          data={contacts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            contacts.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          onRefresh={() => {
            setSearch('');
            load(buildQuery({ search: undefined }), 'refresh', 1);
          }}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            ) : null
          }
          removeClippedSubviews
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true }), 300);
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={52} color={C.textDim} />
              <Text style={styles.emptyTitle}>No contacts found</Text>
              <Text style={styles.emptyMsg}>
                {search
                  ? `No results for "${search}"`
                  : hasFilters
                  ? 'No contacts match the active filters.'
                  : 'No contacts in this view.'}
              </Text>
              {(search || hasFilters) && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => {
                    setSearch('');
                    setActiveStages([]);
                    setScoreMin(0);
                    setScoreMax(100);
                    load({ clientId: activeClientId, sortBy }, 'silent', 1);
                  }}
                >
                  <Text style={styles.emptyResetText}>Clear Search & Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* A-Z Sidebar with scroll buttons at top/bottom */}
        <View style={styles.sidebar}>
          {/* Scroll to Top */}
          <TouchableOpacity
            style={styles.sidebarScrollBtn}
            onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-up" size={14} color={C.primary} />
          </TouchableOpacity>

          {/* Letters (hidden during search) */}
          {!search && ALPHABET.map((letter) => {
            const active = letter in sectionIndexMap;
            return (
              <TouchableOpacity
                key={letter}
                onPress={() => scrollToLetter(letter)}
                disabled={!active}
                hitSlop={{ top: 2, bottom: 2, left: 6, right: 6 }}
              >
                <Text style={[styles.sidebarLetter, !active && styles.sidebarLetterDim]}>
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Scroll to Bottom */}
          <TouchableOpacity
            style={styles.sidebarScrollBtn}
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-down" size={14} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sheets */}
      <SortSheet
        visible={showSort}
        current={sortBy}
        onSelect={handleSortSelect}
        onClose={() => setShowSort(false)}
      />
      <FilterSheet
        visible={showFilter}
        activeStages={activeStages}
        activeScoreMin={scoreMin}
        activeScoreMax={scoreMax}
        onApply={handleFilterApply}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-use-before-define
function makeStyles(C: ReturnType<typeof useAppTheme>['C']) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  headerCount: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },

  // Limit selector
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' },
  limitLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', marginRight: 2 },
  limitPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  limitPillActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  limitPillText: { fontSize: 11, fontWeight: '700', color: C.textMuted },
  limitPillTextActive: { color: C.primaryLight },

  // Client Switcher
  switcherWrap: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  switcherContainer: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  switcherHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  switcherHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.2,
  },
  switcherActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
    maxWidth: 200,
  },
  switcherActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  switcherActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primaryLight,
  },
  switcherContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  switcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  switcherPillActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  switcherLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted, maxWidth: 120 },
  switcherLabelActive: { color: C.primaryLight },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  toolBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: C.white, fontSize: 9, fontWeight: '800' },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  summaryText: { color: C.textMuted, fontSize: 12 },
  summarySep: { color: C.textDim, fontSize: 12, marginHorizontal: 6 },

  // List
  listArea: { flex: 1, position: 'relative' },
  listContent: { paddingHorizontal: 14, paddingRight: 28, paddingTop: 4, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    marginBottom: 10,
    ...SHADOW_SM,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    marginTop: 2,
  },
  avatarText: { color: C.primaryLight, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  cardBody: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardName: { color: C.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 8 },
  stagePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  stageText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  cardCompany: { color: C.textSub, fontSize: 13, marginBottom: 4 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaChipText: { color: C.textMuted, fontSize: 12 },

  // Score bar
  scoreBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: C.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: { height: 4, borderRadius: 2 },
  scoreNum: { fontSize: 12, fontWeight: '800', width: 26, textAlign: 'right' },
  agoText: { color: C.textMuted, fontSize: 11 },

  // Error / Status
  statusText: { color: C.textMuted, marginTop: 14, fontSize: 15, textAlign: 'center' },
  errorTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  errorMsg: { color: C.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { color: C.textSub, fontSize: 17, fontWeight: '700' },
  emptyMsg: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  emptyResetBtn: {
    marginTop: 8,
    backgroundColor: C.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.primaryDimMd,
  },
  emptyResetText: { color: C.primaryLight, fontSize: 14, fontWeight: '600' },

  // Sidebar
  sidebar: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  sidebarLetter: { color: C.primary, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  sidebarLetterDim: { color: C.textDim },

  // Scroll buttons (embedded in sidebar)
  sidebarScrollBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surfaceHigh,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: C.cardBorder,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.textDim,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  sheetRowLabel: { color: C.textSub, fontSize: 15 },
  sheetRowActive: { color: C.primary, fontWeight: '700' },

  // ── Filter Sheet ─────────────────────────────────────────────────────────
  filterSectionLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stagePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },

  // Score range
  scoreRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  scoreRangeField: { flex: 1 },
  scoreRangeLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  scoreRangeInput: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreRangeSep: { width: 20, height: 1, backgroundColor: C.cardBorder, marginTop: 12 },
  filterStagePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterStageText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  filterActions: { flexDirection: 'row', gap: 12 },
  filterReset: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
  },
  filterResetText: { color: C.textMuted, fontSize: 15, fontWeight: '600' },
  filterApply: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  filterApplyText: { color: C.white, fontSize: 15, fontWeight: '700' },
}); }
