import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW_SM } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

const LANGUAGES = [
  { code: 'en-US', label: 'English', region: 'United States', flag: '🇺🇸' },
  { code: 'es-ES', label: 'Español', region: 'España', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español', region: 'México', flag: '🇲🇽' },
  { code: 'fr-FR', label: 'Français', region: 'France', flag: '🇫🇷' },
  { code: 'pt-BR', label: 'Português', region: 'Brasil', flag: '🇧🇷' },
  { code: 'de-DE', label: 'Deutsch', region: 'Deutschland', flag: '🇩🇪' },
];

export default function LanguageScreen() {
  const { C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const [selected] = useState('en-US');

  function handleSelect(code: string) {
    if (code !== 'en-US') {
      Alert.alert('Coming Soon', 'This language will be available in a future update.');
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        Choose your preferred language for the app interface.
      </Text>

      <View style={styles.card}>
        {LANGUAGES.map((lang, i) => {
          const active = selected === lang.code;
          const isLast = i === LANGUAGES.length - 1;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langRow, isLast && styles.langRowLast]}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <View style={styles.langBody}>
                <Text style={styles.langLabel}>{lang.label}</Text>
                <Text style={styles.langRegion}>{lang.region}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: ReturnType<typeof useAppTheme>['C']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },

  subtitle: {
    color: C.textMuted,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW_SM,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 14,
  },
  langRowLast: { borderBottomWidth: 0 },
  flag: { fontSize: 26 },
  langBody: { flex: 1 },
  langLabel: { color: C.text, fontSize: 16, fontWeight: '600' },
  langRegion: { color: C.textMuted, fontSize: 13, marginTop: 2 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: C.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
});
