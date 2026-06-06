import { useMemo, useState } from 'react';
import {
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

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSplash />;

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

        {/* Card */}
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
              placeholder="you@company.com"
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
              placeholder="Enter your password"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPw}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>ProPhone CRM · All rights reserved</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },

  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIconWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primaryDimMd,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  logoSub: { fontSize: 14, color: C.textMuted, marginTop: 4, letterSpacing: 0.5 },

  card: {
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1,
    borderColor: C.cardBorder, padding: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: C.textMuted, marginBottom: 24 },

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

  button: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  footer: { textAlign: 'center', color: C.textDim, fontSize: 12, marginTop: 32 },
});
