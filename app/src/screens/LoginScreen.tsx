import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
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
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import LoadingSplash from '../components/LoadingSplash';

const DEV_USERS = [
  { name: 'Mike Johnson', email: 'mike@geniusai.biz',  role: 'Admin',   initials: 'MJ', color: '#6366f1' },
  { name: 'Sarah Lee',    email: 'sarah@geniusai.biz', role: 'Manager', initials: 'SL', color: '#22c55e' },
  { name: 'James Davis',  email: 'james@geniusai.biz', role: 'Rep',     initials: 'JD', color: '#f59e0b' },
  { name: 'Amy Wilson',   email: 'amy@geniusai.biz',   role: 'Rep',     initials: 'AW', color: '#38bdf8' },
] as const;

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [devOpen, setDevOpen]   = useState(false);

  const devAnim = useRef(new Animated.Value(0)).current;

  function toggleDev() {
    const next = !devOpen;
    setDevOpen(next);
    Animated.spring(devAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      bounciness: 5,
    }).start();
  }

  async function handleLogin(overrideEmail?: string, overridePw?: string) {
    const e = overrideEmail ?? email.trim();
    const p = overridePw   ?? password;
    if (!e || !p) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(e, p);
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSplash />;

  const panelHeight  = devAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] });
  const panelOpacity = devAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIconWrap}>
            <Ionicons name="call" size={32} color={C.primary} />
          </View>
          <Text style={styles.logoText}>ProPhone</Text>
          <Text style={styles.logoSub}>CRM Field Agent</Text>
        </View>

        {/* Dev Quick-Access Panel */}
        <Animated.View style={{ height: panelHeight, overflow: 'hidden', marginBottom: 12 }}>
          <Animated.View style={[styles.devPanel, { opacity: panelOpacity }]}>
            <View style={styles.devPanelHead}>
              <View style={styles.devLiveDot} />
              <Text style={styles.devPanelLabel}>DEV · Quick Access</Text>
              <Text style={styles.devPanelHint}>One tap to sign in · pw: 123456</Text>
            </View>
            <View style={styles.devGrid}>
              {DEV_USERS.map((u) => (
                <TouchableOpacity
                  key={u.email}
                  style={styles.devCard}
                  onPress={() => handleLogin(u.email, '123456')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.devAvatar, { backgroundColor: u.color + '22', borderColor: u.color + '66' }]}>
                    <Text style={[styles.devInitials, { color: u.color }]}>{u.initials}</Text>
                  </View>
                  <Text style={styles.devName} numberOfLines={1}>
                    {u.name.split(' ')[0]}
                  </Text>
                  <View style={[styles.devBadge, { backgroundColor: u.color + '20' }]}>
                    <Text style={[styles.devBadgeText, { color: u.color }]}>{u.role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to continue</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.error} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPw}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
              editable={!loading}
            />
            <Pressable
              onPress={() => setShowPw((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
            </Pressable>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => handleLogin()} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer with hidden DEV toggle */}
        <View style={styles.footerRow}>
          <Text style={styles.footer}>ProPhone CRM · All rights reserved</Text>
          <TouchableOpacity
            onPress={toggleDev}
            style={[styles.devChip, devOpen && styles.devChipActive]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="terminal-outline"
              size={10}
              color={devOpen ? '#f59e0b' : C.textDim}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.devChipText, devOpen && styles.devChipTextActive]}>DEV</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },

  logoArea:     { alignItems: 'center', marginBottom: 32 },
  logoIconWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primaryDimMd,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  logoSub:  { fontSize: 14, color: C.textMuted, marginTop: 4, letterSpacing: 0.5 },

  // ── Dev Panel ──────────────────────────────────────────────────────────────
  devPanel: {
    borderRadius: 18, borderWidth: 1,
    borderColor: '#f59e0b44',
    backgroundColor: '#f59e0b08',
    padding: 16,
  },
  devPanelHead:  { marginBottom: 14 },
  devLiveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#f59e0b', marginBottom: 6,
  },
  devPanelLabel: { fontSize: 12, fontWeight: '800', color: '#f59e0b', letterSpacing: 1 },
  devPanelHint:  { fontSize: 11, color: C.textMuted, marginTop: 2 },

  devGrid: { flexDirection: 'row', gap: 8 },
  devCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, gap: 5,
  },
  devAvatar: {
    width: 44, height: 44, borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  devInitials:   { fontSize: 14, fontWeight: '800' },
  devName:       { fontSize: 12, fontWeight: '700', color: C.text },
  devBadge:      { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  devBadgeText:  { fontSize: 10, fontWeight: '700' },

  // ── Login Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1,
    borderColor: C.cardBorder, padding: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: C.textMuted, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.errorDim, borderRadius: 10, borderWidth: 1,
    borderColor: C.error, padding: 12, marginBottom: 20,
  },
  errorText: { color: C.error, fontSize: 13, flex: 1 },

  label: { color: C.textSub, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, marginBottom: 16, position: 'relative',
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 14, paddingHorizontal: 10 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },

  button:     { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginTop: 32,
  },
  footer: { color: C.textDim, fontSize: 12 },

  devChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: C.cardBorder,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  devChipActive:     { borderColor: '#f59e0b55', backgroundColor: '#f59e0b11' },
  devChipText:       { fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 0.8 },
  devChipTextActive: { color: '#f59e0b' },
});
