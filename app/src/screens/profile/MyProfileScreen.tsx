import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type StylesType = ReturnType<typeof makeStyles>;

function InfoRow({
  icon,
  label,
  value,
  styles,
  C,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
  styles: StylesType;
  C: any;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MyProfileScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.name}>{user?.name ?? 'Agent'}</Text>
        {!!user?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.card}>
        <InfoRow icon="person-outline" label="Full Name" value={user?.name} styles={styles} C={C} />
        <InfoRow icon="mail-outline" label="Email" value={user?.email} styles={styles} C={C} />
        <InfoRow icon="briefcase-outline" label="Role" value={user?.role} styles={styles} C={C} />
        <InfoRow icon="id-card-outline" label="User ID" value={user?.id} styles={styles} C={C} />
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
        <Text style={styles.noticeText}>
          Coming soon...
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: C.primaryDimMd,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryDim,
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.primaryLight, fontSize: 30, fontWeight: '800' },
  name: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  roleBadge: {
    backgroundColor: C.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: { color: C.primaryLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW_SM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '500' },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.primaryDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primaryDimMd,
    padding: 14,
  },
  noticeText: { color: C.textSub, fontSize: 13, flex: 1, lineHeight: 19 },
});
