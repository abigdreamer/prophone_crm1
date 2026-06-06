import { useLayoutEffect, useMemo, useState } from 'react';
import { Linking, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ContactsStackParamList } from '../navigation/ContactsStack';
import type { Contact } from '../types/contact';
import { SHADOW_SM, stageColors } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactDetail'>;

type StylesType = ReturnType<typeof makeStyles>;

function timeAgo(dateStr: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `${mos}mo ago`;
  return `${Math.floor(mos / 12)}y ago`;
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  styles,
  C,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | number | null;
  onPress?: () => void;
  styles: StylesType;
  C: any;
}) {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={styles.infoRow} onPress={onPress} activeOpacity={0.65}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, !!onPress && styles.infoValueLink]} numberOfLines={2}>
          {String(value)}
        </Text>
      </View>
      {!!onPress && (
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      )}
    </Wrap>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: StylesType }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function StatItem({ value, label, styles }: { value: string | number; label: string; styles: StylesType }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const c = route.params.contact;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('LeadForm', { contact: c })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: C.primary, fontSize: 15, fontWeight: '600' }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, c, C]);
  const fullName = `${c.firstName} ${c.lastName}`.trim() || c.company || '—';
  const fullAddress = [c.address, c.city, c.state, c.zip].filter(Boolean).join(', ');
  const stage = stageColors(c.lifecycleStage);
  const ini = (c.firstName?.[0] ?? c.company?.[0] ?? '?').toUpperCase() +
    (c.lastName?.[0] ?? '').toUpperCase();

  function call() {
    if (c.phone) Linking.openURL(`tel:${c.phone}`);
  }
  function mail() {
    if (c.email) Linking.openURL(`mailto:${c.email}`);
  }
  function shareContact() {
    const lines: string[] = [`👤 ${fullName}`];
    if (c.title) lines.push(c.title);
    if (c.company) lines.push(`🏢 ${c.company}`);
    if (c.phone) lines.push(`📞 ${c.phone}`);
    if (c.email) lines.push(`✉️ ${c.email}`);
    if (c.website) lines.push(`🌐 ${c.website}`);
    if (fullAddress) lines.push(`📍 ${fullAddress}`);
    Share.share({ message: lines.join('\n'), title: fullName });
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{ini}</Text>
          </View>
        </View>

        <Text style={styles.name}>{fullName}</Text>
        {!!c.title && <Text style={styles.titleText}>{c.title}</Text>}
        {!!c.company && (
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={13} color={C.primary} />
            <Text style={styles.companyText}>{c.company}</Text>
          </View>
        )}

        {/* Stage + Score */}
        <View style={styles.badgeRow}>
          <View style={[styles.stageBadge, { backgroundColor: stage.bg }]}>
            <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
            <Text style={[styles.stageText, { color: stage.color }]}>
              {c.lifecycleStage}
            </Text>
          </View>
          <View style={styles.scoreBadge}>
            <Ionicons name="star" size={11} color={C.warning} />
            <Text style={styles.scoreBadgeText}>{c.leadScore} score</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem value={c.emailsSent ?? 0} label="Emails" styles={styles} />
          <View style={styles.statDivider} />
          <StatItem value={c.callsMade ?? 0} label="Calls" styles={styles} />
          <View style={styles.statDivider} />
          <StatItem value={timeAgo(c.lastActivityAt)} label="Last Active" styles={styles} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {!!c.phone && (
          <TouchableOpacity style={styles.actionBtn} onPress={call} activeOpacity={0.75}>
            <View style={[styles.actionIcon, { backgroundColor: C.successDim }]}>
              <Ionicons name="call" size={18} color={C.success} />
            </View>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>
        )}
        {!!c.email && (
          <TouchableOpacity style={styles.actionBtn} onPress={mail} activeOpacity={0.75}>
            <View style={[styles.actionIcon, { backgroundColor: C.primaryDim }]}>
              <Ionicons name="mail" size={18} color={C.primary} />
            </View>
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
        )}
        {!!fullAddress && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(fullAddress)}`)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: C.warningDim }]}>
              <Ionicons name="navigate" size={18} color={C.warning} />
            </View>
            <Text style={styles.actionLabel}>Directions</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={shareContact} activeOpacity={0.75}>
          <View style={[styles.actionIcon, { backgroundColor: C.errorDim }]}>
            <Ionicons name="share-social" size={18} color={C.error} />
          </View>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      <Section title="Contact Info" styles={styles}>
        <InfoRow icon="call-outline" label="Phone" value={c.phone} onPress={call} styles={styles} C={C} />
        <InfoRow icon="mail-outline" label="Email" value={c.email} onPress={mail} styles={styles} C={C} />
        <InfoRow icon="location-outline" label="Address" value={fullAddress} styles={styles} C={C} />
        <InfoRow icon="globe-outline" label="Website" value={c.website} onPress={() => c.website && Linking.openURL(c.website.startsWith('http') ? c.website : `https://${c.website}`)} styles={styles} C={C} />
      </Section>

      {/* Pipeline */}
      <Section title="Pipeline" styles={styles}>
        <InfoRow icon="flag-outline" label="Stage" value={c.lifecycleStage} styles={styles} C={C} />
        <InfoRow icon="trending-up-outline" label="Lead Score" value={c.leadScore} styles={styles} C={C} />
        <InfoRow icon="funnel-outline" label="Source" value={c.source} styles={styles} C={C} />
        <InfoRow icon="megaphone-outline" label="Campaign" value={c.campaign} styles={styles} C={C} />
        <InfoRow icon="checkmark-circle-outline" label="Status" value={c.status} styles={styles} C={C} />
        {c.contractValue > 0 && (
          <InfoRow icon="cash-outline" label="Contract Value" value={`$${c.contractValue.toLocaleString()}`} styles={styles} C={C} />
        )}
      </Section>

      {/* Company & Account */}
      <Section title="Company & Account" styles={styles}>
        <InfoRow icon="business-outline" label="Company" value={c.company} styles={styles} C={C} />
        <InfoRow icon="people-outline" label="Account Size" value={c.accountSize} styles={styles} C={C} />
        {c.trucks > 0 && <InfoRow icon="car-outline" label="Trucks" value={c.trucks} styles={styles} C={C} />}
        {c.yearsInBusiness > 0 && <InfoRow icon="calendar-outline" label="Years in Business" value={c.yearsInBusiness} styles={styles} C={C} />}
        {c.serviceAreaMiles > 0 && <InfoRow icon="map-outline" label="Service Area (mi)" value={c.serviceAreaMiles} styles={styles} C={C} />}
        <InfoRow icon="desktop-outline" label="Dispatcher Software" value={c.dispatcherSoftware} styles={styles} C={C} />
      </Section>

      {/* Timeline */}
      <ActivityTimeline activities={c.activities ?? []} C={C} styles={styles} />

    </ScrollView>
  );
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

type ActivityFilter = 'all' | 'email' | 'call' | 'sms' | 'note' | 'meeting' | 'system';

const TIMELINE_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'email',   label: 'Email' },
  { key: 'call',    label: 'Call' },
  { key: 'sms',     label: 'SMS' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'note',    label: 'Note' },
  { key: 'system',  label: 'System' },
];

function activityMatchesFilter(type: string, filter: ActivityFilter) {
  if (filter === 'all') return true;
  if (filter === 'email')   return type.startsWith('email_');
  if (filter === 'call')    return type.startsWith('call_');
  if (filter === 'sms')     return type.startsWith('sms_');
  if (filter === 'meeting') return type.startsWith('meeting_') || type.startsWith('demo_');
  if (filter === 'note')    return type === 'note_added';
  if (filter === 'system')  return ['stage_changed','lead_updated','contact_created','cancel_contact','uncancel_contact','form_submitted','ad_clicked','ad_impression','proposal_sent','contract_signed'].includes(type);
  return true;
}

function activityIcon(type: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (type.startsWith('email_'))    return 'mail-outline';
  if (type.startsWith('call_'))     return 'call-outline';
  if (type.startsWith('sms_'))      return 'chatbubble-outline';
  if (type.startsWith('meeting_') || type.startsWith('demo_')) return 'calendar-outline';
  if (type === 'note_added')        return 'create-outline';
  if (type === 'stage_changed')     return 'flag-outline';
  if (type === 'lead_updated')      return 'pencil-outline';
  if (type.startsWith('ad_'))       return 'megaphone-outline';
  if (type === 'proposal_sent')     return 'document-text-outline';
  if (type === 'contract_signed')   return 'checkmark-done-outline';
  return 'flash-outline';
}

function activityColor(type: string, C: any): string {
  if (type.startsWith('email_'))    return C.primary;
  if (type.startsWith('call_'))     return C.success;
  if (type.startsWith('sms_'))      return '#f59e0b';
  if (type.startsWith('meeting_') || type.startsWith('demo_')) return '#8b5cf6';
  if (type === 'note_added')        return C.warning;
  if (type === 'stage_changed')     return '#f97316';
  if (type.startsWith('ad_'))       return '#06b6d4';
  return C.textSub;
}

function activityTitle(type: string): string {
  const map: Record<string, string> = {
    email_sent: 'Email Sent', email_opened: 'Email Opened', email_clicked: 'Email Clicked',
    email_replied: 'Email Replied', call_made: 'Call Made', call_answered: 'Call Answered',
    sms_sent: 'SMS Sent', sms_received: 'SMS Received', meeting_scheduled: 'Meeting Scheduled',
    meeting_held: 'Meeting Held', demo_scheduled: 'Demo Scheduled', demo_held: 'Demo Held',
    note_added: 'Note Added', stage_changed: 'Stage Changed', lead_updated: 'Lead Updated',
    form_submitted: 'Form Submitted', ad_clicked: 'Ad Clicked', ad_impression: 'Ad Impression',
    proposal_sent: 'Proposal Sent', contract_signed: 'Contract Signed',
    contact_created: 'Contact Created', cancel_contact: 'Canceled', uncancel_contact: 'Restored',
  };
  return map[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function activityTypeBadge(type: string): string {
  if (type.startsWith('email_'))    return 'EMAIL';
  if (type.startsWith('call_'))     return 'CALL';
  if (type.startsWith('sms_'))      return 'SMS';
  if (type.startsWith('meeting_') || type.startsWith('demo_')) return 'MEETING';
  if (type === 'note_added')        return 'NOTE';
  if (type.startsWith('ad_'))       return 'AD';
  if (type === 'proposal_sent' || type === 'contract_signed') return 'PROPOSAL';
  return 'SYSTEM';
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function userInitials(by: string): string {
  return by.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function groupByDate(activities: NonNullable<Contact['activities']>) {
  const groups: { dateKey: string; items: NonNullable<Contact['activities']> }[] = [];
  const seen: Record<string, number> = {};
  const sorted = [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  for (const a of sorted) {
    const key = new Date(a.createdAt).toDateString();
    if (seen[key] === undefined) { seen[key] = groups.length; groups.push({ dateKey: a.createdAt, items: [] }); }
    groups[seen[key]].items.push(a);
  }
  return groups;
}

function ActivityTimeline({ activities, C, styles }: {
  activities: NonNullable<Contact['activities']>;
  C: any; styles: any;
}) {
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filtered = useMemo(
    () => activities.filter((a) => activityMatchesFilter(a.type, filter)),
    [activities, filter],
  );

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Timeline</Text>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tlFilterScroll} contentContainerStyle={styles.tlFilterRow}>
        {TIMELINE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.tlFilterTab, active && styles.tlFilterTabActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tlFilterText, active && styles.tlFilterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {groups.length === 0 ? (
        <View style={styles.tlEmpty}>
          <Ionicons name="time-outline" size={36} color={C.textDim} />
          <Text style={styles.tlEmptyText}>No activity yet</Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.dateKey}>
            {/* Date header */}
            <View style={styles.tlDateRow}>
              <Text style={styles.tlDateLabel}>{formatDateHeader(group.dateKey)}</Text>
              <View style={styles.tlDateLine} />
              <Text style={styles.tlDateCount}>{group.items.length} event{group.items.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Items */}
            {group.items.map((a, idx) => {
              const color = activityColor(a.type, C);
              const isLast = idx === group.items.length - 1;
              return (
                <View key={a.id} style={styles.tlItem}>
                  {/* Left column: line + icon */}
                  <View style={styles.tlLeftCol}>
                    <View style={[styles.tlIcon, { backgroundColor: `${color}18` }]}>
                      <Ionicons name={activityIcon(a.type)} size={14} color={color} />
                    </View>
                    {!isLast && <View style={[styles.tlLine, { backgroundColor: C.cardBorder }]} />}
                  </View>

                  {/* Content */}
                  <View style={styles.tlContent}>
                    <View style={styles.tlTitleRow}>
                      <Text style={styles.tlTitle}>{activityTitle(a.type)}</Text>
                      <View style={[styles.tlBadge, { backgroundColor: `${color}18` }]}>
                        <Text style={[styles.tlBadgeText, { color }]}>{activityTypeBadge(a.type)}</Text>
                      </View>
                    </View>
                    {!!a.note && <Text style={styles.tlNote} numberOfLines={3}>{a.note}</Text>}
                    <View style={styles.tlMeta}>
                      {!!a.by && (
                        <>
                          <View style={styles.tlAvatar}>
                            <Text style={styles.tlAvatarText}>{userInitials(a.by)}</Text>
                          </View>
                          <Text style={styles.tlBy}>by {a.by} · </Text>
                        </>
                      )}
                      <Text style={styles.tlTime}>{formatTime(a.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },

  // Header
  headerCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    padding: 28,
    marginBottom: 14,
    ...SHADOW_SM,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: C.primaryDimMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: C.primaryDim,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.primaryLight, fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  name: { color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  titleText: { color: C.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  companyText: { color: C.primaryLight, fontSize: 14, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.warningDim,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  scoreBadgeText: { color: C.warning, fontWeight: '700', fontSize: 12 },

  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    width: '100%',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: C.text, fontWeight: '800', fontSize: 16 },
  statLabel: { color: C.textMuted, fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, backgroundColor: C.cardBorder, alignSelf: 'stretch' },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
    justifyContent: 'space-around',
    ...SHADOW_SM,
  },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: C.textSub, fontSize: 12, fontWeight: '600' },

  // Section
  section: { marginBottom: 14 },
  sectionTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    ...SHADOW_SM,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 12,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1 },
  infoLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { color: C.text, fontSize: 14, fontWeight: '500' },
  infoValueLink: { color: C.primaryLight },

  // Timeline
  tlFilterScroll: { flexGrow: 0, marginBottom: 14 },
  tlFilterRow: { flexDirection: 'row', gap: 6 },
  tlFilterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.card },
  tlFilterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tlFilterText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tlFilterTextActive: { color: C.white, fontWeight: '700' },

  tlEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  tlEmptyText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  tlDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  tlDateLabel: { fontSize: 12, fontWeight: '700', color: C.textSub, flexShrink: 0 },
  tlDateLine: { flex: 1, height: 1, backgroundColor: C.cardBorder },
  tlDateCount: { fontSize: 11, color: C.textMuted, flexShrink: 0 },

  tlItem: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  tlLeftCol: { alignItems: 'center', width: 32 },
  tlIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tlLine: { width: 1, flex: 1, minHeight: 16, marginVertical: 4 },

  tlContent: { flex: 1, paddingBottom: 16 },
  tlTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tlTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  tlBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tlBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  tlNote: { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 6 },
  tlMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tlAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  tlAvatarText: { fontSize: 8, fontWeight: '800', color: C.primaryLight },
  tlBy: { fontSize: 11, color: C.textMuted },
  tlTime: { fontSize: 11, color: C.textMuted },
});
