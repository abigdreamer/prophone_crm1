import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type Toggle = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  sub: string;
  key: string;
};

type StylesType = ReturnType<typeof makeStyles>;

function ToggleRow({ item, value, onChange, isLast, styles, C }: {
  item: Toggle; value: boolean; onChange: (v: boolean) => void;
  isLast?: boolean; styles: StylesType; C: any;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={16} color={item.iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        <Text style={styles.rowSub}>{item.sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: C.cardBorder, true: C.primaryDimMd }}
        thumbColor={value ? C.primary : C.textMuted} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const PUSH_TOGGLES: Toggle[] = [
    { icon: 'person-add-outline', iconColor: C.primary, iconBg: C.primaryDim, label: 'New Contact Added', sub: 'When a contact is added to your pool', key: 'newContact' },
    { icon: 'flag-outline', iconColor: '#34D399', iconBg: 'rgba(52,211,153,0.12)', label: 'Stage Changes', sub: 'When a lead progresses in the pipeline', key: 'stageChange' },
    { icon: 'call-outline', iconColor: '#FBBF24', iconBg: 'rgba(251,191,36,0.12)', label: 'Call Reminders', sub: 'Scheduled call follow-up reminders', key: 'callReminder' },
    { icon: 'trophy-outline', iconColor: '#4ADE80', iconBg: 'rgba(74,222,128,0.12)', label: 'Deal Won', sub: 'When a contract is signed', key: 'dealWon' },
  ];

  const EMAIL_TOGGLES: Toggle[] = [
    { icon: 'document-text-outline', iconColor: '#A78BFA', iconBg: 'rgba(167,139,250,0.12)', label: 'Weekly Summary', sub: 'Pipeline report every Monday', key: 'weeklySummary' },
    { icon: 'alert-circle-outline', iconColor: '#F87171', iconBg: 'rgba(248,113,113,0.12)', label: 'Urgent Alerts', sub: 'High-priority activity notifications', key: 'urgentAlerts' },
  ];

  const [pushSettings, setPushSettings] = useState<Record<string, boolean>>({
    newContact: true, stageChange: true, callReminder: true, dealWon: true,
  });
  const [emailSettings, setEmailSettings] = useState<Record<string, boolean>>({
    weeklySummary: true, urgentAlerts: false,
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Push Notifications</Text>
      <View style={styles.card}>
        {PUSH_TOGGLES.map((item, i) => (
          <ToggleRow key={item.key} item={item} value={pushSettings[item.key] ?? false}
            onChange={(v) => setPushSettings((s) => ({ ...s, [item.key]: v }))}
            isLast={i === PUSH_TOGGLES.length - 1} styles={styles} C={C} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Email Notifications</Text>
      <View style={styles.card}>
        {EMAIL_TOGGLES.map((item, i) => (
          <ToggleRow key={item.key} item={item} value={emailSettings[item.key] ?? false}
            onChange={(v) => setEmailSettings((s) => ({ ...s, [item.key]: v }))}
            isLast={i === EMAIL_TOGGLES.length - 1} styles={styles} C={C} />
        ))}
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
        <Text style={styles.noticeText}>
          Ensure notifications are enabled in your device settings for real-time alerts.
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
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { color: C.text, fontSize: 15, fontWeight: '500' },
  rowSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.primaryDim, borderRadius: 12, borderWidth: 1, borderColor: C.primaryDimMd, padding: 14 },
  noticeText: { color: C.textSub, fontSize: 13, flex: 1, lineHeight: 19 },
});
