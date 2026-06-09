import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type StylesType = ReturnType<typeof makeStyles>;

function ToggleRow({
  icon, label, sub, value, onChange, isLast, styles, C,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; sub?: string; value: boolean;
  onChange: (v: boolean) => void; isLast?: boolean;
  styles: StylesType; C: any;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: C.cardBorder, true: C.primaryDimMd }}
        thumbColor={value ? C.primary : C.textMuted} />
    </View>
  );
}

function LinkRow({
  icon, label, url, isLast, styles, C,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; url: string; isLast?: boolean;
  styles: StylesType; C: any;
}) {
  return (
    <TouchableOpacity style={[styles.row, isLast && styles.rowLast]} onPress={() => Linking.openURL(url)} activeOpacity={0.65}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="open-outline" size={15} color={C.textMuted} />
    </TouchableOpacity>
  );
}

export default function PrivacyScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [locationData, setLocationData] = useState(false);

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Data & Analytics</Text>
      <View style={styles.card}>
        <ToggleRow icon="bar-chart-outline" label="Usage Analytics" sub="Help us improve the app with anonymized data" value={analytics} onChange={setAnalytics} styles={styles} C={C} />
        <ToggleRow icon="bug-outline" label="Crash Reports" sub="Automatically send crash reports" value={crashReports} onChange={setCrashReports} styles={styles} C={C} />
        <ToggleRow icon="location-outline" label="Location Data" sub="Used for route planning features" value={locationData} onChange={setLocationData} isLast styles={styles} C={C} />
      </View>

      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.card}>
        <LinkRow icon="document-text-outline" label="Privacy Policy" url="https://prophone.app/privacy" styles={styles} C={C} />
        <LinkRow icon="reader-outline" label="Terms of Service" url="https://prophone.app/terms" isLast styles={styles} C={C} />
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="shield-checkmark" size={18} color={C.success} style={{ marginRight: 10 }} />
        <Text style={styles.noticeText}>
          Your contact and sales data is encrypted at rest and in transit. We never sell your data to third parties.
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },
  sectionTitle: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 22, ...SHADOW_SM },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder, gap: 14 },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { color: C.text, fontSize: 15, fontWeight: '500' },
  rowSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.successDim, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', padding: 14 },
  noticeText: { color: C.textSub, fontSize: 13, flex: 1, lineHeight: 19 },
});
