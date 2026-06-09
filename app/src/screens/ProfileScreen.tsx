import { useMemo } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { SHADOW_SM } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
};

type StylesType = ReturnType<typeof makeStyles>;

type MenuItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  iconBg?: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
  styles: StylesType;
  C: any;
};

function MenuItem({ icon, iconColor, iconBg, label, subtitle, onPress, isLast, destructive, styles, C }: MenuItemProps) {
  const resolvedIconColor = iconColor ?? C.primary;
  const resolvedIconBg = iconBg ?? C.primaryDim;
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[styles.menuIcon, { backgroundColor: resolvedIconBg }]}>
        <Ionicons name={icon} size={18} color={resolvedIconColor} />
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
        {!!subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function MenuSection({ title, children, styles }: { title: string; children: React.ReactNode; styles: StylesType }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const userInitials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  function confirmLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Screen Title */}
      <Text style={styles.screenTitle}>Profile</Text>

      {/* User Header Card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatarWrap}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitials}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name ?? 'Agent'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          {!!user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Account */}
      <MenuSection title="Account" styles={styles}>
        <MenuItem
          icon="person-outline"
          label="My Profile"
          subtitle="View and edit your info"
          onPress={() => navigation.navigate('MyProfile')}
          styles={styles}
          C={C}
        />
        <MenuItem
          icon="moon-outline"
          iconColor="#A78BFA"
          iconBg="rgba(167,139,250,0.12)"
          label="Theme"
          subtitle="Dark · Light · System"
          onPress={() => navigation.navigate('Theme')}
          styles={styles}
          C={C}
        />
        <MenuItem
          icon="language-outline"
          iconColor="#60A5FA"
          iconBg="rgba(96,165,250,0.12)"
          label="Language"
          subtitle="English (US)"
          onPress={() => navigation.navigate('Language')}
          styles={styles}
          C={C}
        />
        <MenuItem
          icon="settings-outline"
          iconColor="#34D399"
          iconBg="rgba(52,211,153,0.12)"
          label="Account Settings"
          subtitle="Security, password, 2FA"
          onPress={() => navigation.navigate('AccountSettings')}
          isLast
          styles={styles}
          C={C}
        />
      </MenuSection>

      {/* Preferences — hidden for now, kept for future use */}
      <View style={{ display: 'none' }}>
        <MenuSection title="Preferences" styles={styles}>
          <MenuItem
            icon="notifications-outline"
            iconColor="#FBBF24"
            iconBg="rgba(251,191,36,0.12)"
            label="Notifications"
            subtitle="Push, email, SMS alerts"
            onPress={() => navigation.navigate('NotificationsSettings')}
            styles={styles}
            C={C}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor="#F87171"
            iconBg="rgba(248,113,113,0.12)"
            label="Privacy & Security"
            subtitle="Data, permissions, analytics"
            onPress={() => navigation.navigate('PrivacyAndSecurity')}
            isLast
            styles={styles}
            C={C}
          />
        </MenuSection>
      </View>

      {/* Support */}
      <MenuSection title="Support" styles={styles}>
        <MenuItem
          icon="help-circle-outline"
          iconColor="#60A5FA"
          iconBg="rgba(96,165,250,0.12)"
          label="Help & Support"
          subtitle="FAQ, contact us"
          onPress={() => navigation.navigate('HelpAndSupport')}
          isLast
          styles={styles}
          C={C}
        />
      </MenuSection>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={styles.version}>ProPhone CRM · v1.0.0</Text>
    </ScrollView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20 },

  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 20,
    letterSpacing: 0.2,
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 18,
    marginBottom: 28,
    gap: 16,
    ...SHADOW_SM,
  },
  userAvatarWrap: { position: 'relative' },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primaryDim,
    borderWidth: 2,
    borderColor: C.primaryDimMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: C.primaryLight,
    fontSize: 22,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.card,
  },
  userInfo: { flex: 1 },
  userName: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  userEmail: {
    color: C.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: C.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Menu
  section: { marginBottom: 22 },
  sectionTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    ...SHADOW_SM,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 14,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { flex: 1 },
  menuLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  menuLabelDestructive: { color: C.error },
  menuSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  // Logout
  logoutSection: { marginBottom: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.errorDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 15,
    gap: 10,
  },
  logoutText: {
    color: C.error,
    fontSize: 16,
    fontWeight: '700',
  },

  version: {
    textAlign: 'center',
    color: C.textDim,
    fontSize: 12,
    marginTop: 4,
  },
});
