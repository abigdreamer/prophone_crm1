import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type StylesType = ReturnType<typeof makeStyles>;

function ActionRow({
  icon,
  iconColor,
  label,
  onPress,
  isLast,
  styles,
  C,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  styles: StylesType;
  C: any;
}) {
  const resolvedIconColor = iconColor ?? C.primary;
  return (
    <TouchableOpacity style={[styles.row, isLast && styles.rowLast]} onPress={onPress} activeOpacity={0.65}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={resolvedIconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  );
}

export default function AccountSettingsScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  function notAvailable() {
    Alert.alert('Coming Soon', 'This feature will be available in a future update.');
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <ActionRow icon="key-outline" label="Change Password" onPress={notAvailable} styles={styles} C={C} />
        <ActionRow icon="mail-outline" label="Change Email" onPress={notAvailable} isLast styles={styles} C={C} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 14,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, color: C.text, fontSize: 15, fontWeight: '500' },
});
