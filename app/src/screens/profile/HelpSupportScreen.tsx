import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type StylesType = ReturnType<typeof makeStyles>;

const FAQS = [
  {
    q: 'How do I add a new contact?',
    a: 'Contacts are managed from the web dashboard. Open ProPhone CRM in your browser, navigate to Contacts, and click "Add Contact". The mobile app syncs automatically.',
  },
  {
    q: 'Why can\'t I see my contacts?',
    a: 'Make sure you\'re connected to the internet and your session is active. Try pulling down on the contacts list to refresh. If the issue persists, sign out and sign back in.',
  },
  {
    q: 'How do I change my active client view?',
    a: 'On the Contacts screen, use the client switcher pills below the header to filter by a specific client, or tap "All" to see every contact in your pool.',
  },
  {
    q: 'Can I edit contact information in the app?',
    a: 'Editing is currently only available through the web dashboard. The mobile app is optimized for viewing and quick actions like calling and emailing.',
  },
  {
    q: 'How do I reset my password?',
    a: 'Visit the ProPhone web dashboard and click "Forgot password" on the login screen. A reset link will be sent to your registered email address.',
  },
];

function FaqItem({ q, a, styles, C }: { q: string; a: string; styles: StylesType; C: any }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqHeader} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
      </TouchableOpacity>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </View>
  );
}

export default function HelpSupportScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Contact Support */}
      <Text style={styles.sectionTitle}>Contact Support</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => Linking.openURL('mailto:support@prophone.app')}
          activeOpacity={0.65}
        >
          <View style={[styles.supportIcon, { backgroundColor: C.primaryDim }]}>
            <Ionicons name="mail-outline" size={20} color={C.primary} />
          </View>
          <View style={styles.supportBody}>
            <Text style={styles.supportLabel}>Email Support</Text>
            <Text style={styles.supportSub}>support@prophone.app</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.supportRow, styles.supportRowLast]}
          onPress={() => Linking.openURL('https://prophone.app/help')}
          activeOpacity={0.65}
        >
          <View style={[styles.supportIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
            <Ionicons name="globe-outline" size={20} color={C.success} />
          </View>
          <View style={styles.supportBody}>
            <Text style={styles.supportLabel}>Help Center</Text>
            <Text style={styles.supportSub}>prophone.app/help</Text>
          </View>
          <Ionicons name="open-outline" size={15} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* FAQ */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      <View style={styles.card}>
        {FAQS.map((faq, i) => (
          <View key={i} style={i < FAQS.length - 1 ? styles.faqDivider : undefined}>
            <FaqItem q={faq.q} a={faq.a} styles={styles} C={C} />
          </View>
        ))}
      </View>

      {/* Version */}
      <View style={styles.versionCard}>
        <Text style={styles.versionLabel}>App Version</Text>
        <Text style={styles.versionVal}>1.0.0 (build 1)</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },

  sectionTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    marginBottom: 22,
    ...SHADOW_SM,
  },

  // Support rows
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 14,
  },
  supportRowLast: { borderBottomWidth: 0 },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBody: { flex: 1 },
  supportLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  supportSub: { color: C.textMuted, fontSize: 13, marginTop: 2 },

  // FAQ
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  faqItem: { padding: 16 },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQ: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
  faqA: { color: C.textMuted, fontSize: 13, marginTop: 10, lineHeight: 19 },

  // Version
  versionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  versionLabel: { color: C.textMuted, fontSize: 14 },
  versionVal: { color: C.textSub, fontSize: 14, fontWeight: '600' },
});
