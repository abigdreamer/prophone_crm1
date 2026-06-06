import { useMemo } from 'react';
import {
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
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = {
  navigation: NativeStackNavigationProp<MarketingStackParamList, 'TemplateDetail'>;
  route: RouteProp<MarketingStackParamList, 'TemplateDetail'>;
};

function formatDate(str: string) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function TemplateDetailScreen({ navigation, route }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { template } = route.params;

  const isPublished = template.status === 'published';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>{template.name}</Text>
          <Text style={styles.headerSub}>Email Template</Text>
        </View>
        <StatusBadge status={template.status} size="sm" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Preview card */}
        <View style={styles.previewCard}>
          <View style={[styles.previewBanner, { backgroundColor: isPublished ? C.successDim : C.warningDim }]}>
            <View style={[styles.previewIconWrap, { backgroundColor: isPublished ? `${C.success}22` : `${C.warning}22` }]}>
              <Ionicons
                name={isPublished ? 'document-text' : 'document-outline'}
                size={36}
                color={isPublished ? C.success : C.warning}
              />
            </View>
            <Text style={[styles.previewBannerLabel, { color: isPublished ? C.success : C.warning }]}>
              {isPublished ? 'Published Template' : 'Draft Template'}
            </Text>
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName} numberOfLines={2}>{template.name}</Text>
            {template.subject ? (
              <Text style={styles.previewSubject} numberOfLines={1}>{template.subject}</Text>
            ) : null}
          </View>
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>Template Details</Text>
        <View style={styles.detailCard}>
          {[
            { icon: 'mail-outline' as const,   label: 'Subject Line', value: template.subject || '—' },
            { icon: 'person-outline' as const,  label: 'From Email',   value: template.fromEmail || '—' },
            { icon: 'calendar-outline' as const, label: 'Last Updated', value: formatDate(template.updatedAt) },
            { icon: 'time-outline' as const,    label: 'Created',      value: formatDate(template.createdAt) },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.detailRow, i === arr.length - 1 && styles.detailRowLast]}>
              <Ionicons name={row.icon} size={15} color={C.textMuted} />
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Status section */}
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIcon,
              { backgroundColor: isPublished ? C.successDim : C.warningDim },
            ]}>
              <Ionicons
                name={isPublished ? 'checkmark-circle' : 'create-outline'}
                size={20}
                color={isPublished ? C.success : C.warning}
              />
            </View>
            <View style={styles.statusBody}>
              <Text style={styles.statusTitle}>{isPublished ? 'Published' : 'Draft'}</Text>
              <Text style={styles.statusHint}>
                {isPublished
                  ? 'This template is live and can be used in campaigns.'
                  : 'This template is a draft and not yet available for campaigns.'}
              </Text>
            </View>
          </View>
        </View>

        {template.isCanceled && (
          <View style={styles.canceledBanner}>
            <Ionicons name="close-circle-outline" size={16} color={C.error} />
            <Text style={styles.canceledText}>This template has been archived.</Text>
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

  previewCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 20, ...SHADOW_SM },
  previewBanner: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  previewBannerLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  previewInfo: { padding: 14, borderTopWidth: 1, borderTopColor: C.cardBorder },
  previewName: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
  previewSubject: { fontSize: 12, color: C.textMuted },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  detailCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20, ...SHADOW_SM },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.cardBorder, gap: 10 },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, width: 80 },
  detailValue: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },

  statusCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 12, ...SHADOW_SM },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusBody: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 },
  statusHint: { fontSize: 13, color: C.textMuted, lineHeight: 18 },

  canceledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.errorDim, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.error },
  canceledText: { fontSize: 13, color: C.error, fontWeight: '600' },
}); }
