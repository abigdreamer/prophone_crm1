import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import StatusBadge from '../../components/marketing/StatusBadge';
import { SHADOW_SM } from '../../theme';
import type { Domain, DnsRecord } from '../../types/marketing';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = {
  navigation: NativeStackNavigationProp<MarketingStackParamList, 'DomainDetail'>;
  route: RouteProp<MarketingStackParamList, 'DomainDetail'>;
};

function parseRecord(jsonStr: string): DnsRecord | null {
  try { return JSON.parse(jsonStr) as DnsRecord; } catch { return null; }
}

function formatDate(str: string) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── DNS Record Card ──────────────────────────────────────────────────────────

const DnsCard = ({
  record, label, accentColor,
}: { record: DnsRecord | null; label: string; accentColor: string }) => {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [copied, setCopied] = useState(false);

  if (!record?.name && !record?.value) return null;

  function showValue(text: string) {
    Alert.alert(`${label} Record Value`, text, [{ text: 'Close' }]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isVerified = record.status === 'verified';

  return (
    <View style={[styles.dnsCard, { borderLeftColor: accentColor }]}>
      <View style={styles.dnsCardHeader}>
        <View style={[styles.dnsTypePill, { backgroundColor: `${accentColor}18` }]}>
          <Text style={[styles.dnsTypeLabel, { color: accentColor }]}>{label}</Text>
        </View>
        {record.type && <Text style={styles.dnsRecordType}>{record.type}</Text>}
        <View style={{ flex: 1 }} />
        {isVerified ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={C.success} />
            <Text style={[styles.verifiedText, { color: C.success }]}>Verified</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={12} color="#f59e0b" />
            <Text style={[styles.pendingText]}>Pending</Text>
          </View>
        )}
      </View>

      {record.name && (
        <View style={styles.dnsField}>
          <Text style={styles.dnsFieldLabel}>Name / Host</Text>
          <View style={styles.dnsValueWrap}>
            <Text style={styles.dnsFieldValue} selectable>{record.name}</Text>
          </View>
        </View>
      )}

      {record.value && (
        <View style={styles.dnsField}>
          <Text style={styles.dnsFieldLabel}>Value</Text>
          <View style={styles.dnsValueWrap}>
            <Text style={styles.dnsFieldValue} numberOfLines={3} selectable>{record.value}</Text>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => showValue(record.value)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={copied ? 'checkmark' : 'eye-outline'} size={15} color={copied ? C.success : C.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {record.ttl && (
        <Text style={styles.dnsTtl}>TTL: {record.ttl}</Text>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DomainDetailScreen({ navigation, route }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { domain } = route.params;

  const spf   = parseRecord(domain.spfRecord);
  const dkim  = parseRecord(domain.dkimRecord);
  const dmarc = parseRecord(domain.dmarcRecord);

  const statusColor =
    domain.status === 'verified' ? C.success :
    domain.status === 'pending'  ? '#f59e0b' : C.error;

  const steps = [
    { key: 'spf',   label: 'SPF',   done: spf?.status === 'verified',   color: '#3b82f6' },
    { key: 'dkim',  label: 'DKIM',  done: dkim?.status === 'verified',  color: '#8b5cf6' },
    { key: 'dmarc', label: 'DMARC', done: dmarc?.status === 'verified', color: '#f59e0b' },
  ];
  const verifiedCount = steps.filter((s) => s.done).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>{domain.domainName}</Text>
          <Text style={styles.headerSub}>Email Sending Domain</Text>
        </View>
        <StatusBadge status={domain.status} size="sm" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Domain overview card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewIconWrap}>
            <View style={[styles.overviewIcon, { backgroundColor: `${statusColor}18` }]}>
              <Ionicons name="globe" size={32} color={statusColor} />
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <View style={styles.overviewInfo}>
            <Text style={styles.overviewDomain}>{domain.domainName}</Text>
            {domain.defaultFromEmail ? (
              <Text style={styles.overviewFrom}>Default from: {domain.defaultFromEmail}</Text>
            ) : null}
            <Text style={styles.overviewDate}>Added {formatDate(domain.createdAt)}</Text>
          </View>
        </View>

        {/* Verification progress */}
        <Text style={styles.sectionTitle}>Verification Status</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            {steps.map((step, i) => (
              <View key={step.key} style={styles.progressStep}>
                <View style={[
                  styles.progressCircle,
                  { backgroundColor: step.done ? step.color : C.surface, borderColor: step.done ? step.color : C.cardBorder },
                ]}>
                  {step.done
                    ? <Ionicons name="checkmark" size={14} color={C.white} />
                    : <Text style={[styles.progressNum, { color: C.textMuted }]}>{i + 1}</Text>
                  }
                </View>
                {i < steps.length - 1 && (
                  <View style={[styles.progressLine, { backgroundColor: steps[i + 1].done ? steps[i + 1].color : C.cardBorder }]} />
                )}
                <Text style={[styles.progressLabel, { color: step.done ? step.color : C.textMuted }]}>{step.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.progressSummary}>
            {verifiedCount} of {steps.length} records verified
          </Text>
        </View>

        {/* DNS Records */}
        <Text style={styles.sectionTitle}>DNS Records</Text>
        <Text style={styles.sectionHint}>Add these records to your DNS provider to verify your domain.</Text>

        <DnsCard record={spf}   label="SPF"   accentColor="#3b82f6" />
        <DnsCard record={dkim}  label="DKIM"  accentColor="#8b5cf6" />
        <DnsCard record={dmarc} label="DMARC" accentColor="#f59e0b" />

        {!spf?.name && !dkim?.name && !dmarc?.name && (
          <View style={styles.noDnsWrap}>
            <Ionicons name="information-circle-outline" size={36} color={C.textDim} />
            <Text style={styles.noDnsText}>DNS records not available yet.</Text>
            <Text style={styles.noDnsHint}>Verify your domain to generate DNS records.</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useAppTheme>['C']) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  headerBody: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  overviewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 18, marginBottom: 20, gap: 16, ...SHADOW_SM },
  overviewIconWrap: { position: 'relative' },
  overviewIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusDot: { position: 'absolute', bottom: 1, right: 1, width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: C.card },
  overviewInfo: { flex: 1 },
  overviewDomain: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.3 },
  overviewFrom: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  overviewDate: { fontSize: 11, color: C.textDim },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  sectionHint: { fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 17 },

  progressCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 20, ...SHADOW_SM },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
  progressCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  progressNum: { fontSize: 12, fontWeight: '800' },
  progressLine: { position: 'absolute', top: 15, left: '55%', right: '-45%', height: 2 },
  progressLabel: { fontSize: 11, fontWeight: '700' },
  progressSummary: { fontSize: 13, color: C.textSub, textAlign: 'center', fontWeight: '600' },

  dnsCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, borderLeftWidth: 3, marginBottom: 12, padding: 14, ...SHADOW_SM },
  dnsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dnsTypePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dnsTypeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  dnsRecordType: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },

  dnsField: { marginBottom: 10 },
  dnsFieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dnsValueWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.surface, borderRadius: 8, padding: 10 },
  dnsFieldValue: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 17 },
  viewBtn: { paddingTop: 1 },
  dnsTtl: { fontSize: 10, color: C.textDim, marginTop: 4 },

  noDnsWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  noDnsText: { fontSize: 16, fontWeight: '700', color: C.textSub },
  noDnsHint: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
}); }
