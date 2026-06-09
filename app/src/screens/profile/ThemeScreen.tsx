import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_LIST, useAppTheme } from '../../context/ThemeContext';

const THEME_META: Record<string, {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  subtitle: string;
  preview: string[];
}> = {
  dark:       { icon: 'moon',                  iconColor: '#6366f1', iconBg: 'rgba(99,102,241,0.12)',    subtitle: 'Default dark theme',           preview: ['#0b0c10', '#181d27', '#6366f1'] },
  light:      { icon: 'sunny',                 iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)',    subtitle: 'Bright and clean',             preview: ['#f1f5f9', '#f8fafc', '#6366f1'] },
  midnight:   { icon: 'planet-outline',        iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)',    subtitle: 'Deep blue · Linear style',     preview: ['#060810', '#111827', '#3b82f6'] },
  dracula:    { icon: 'color-palette-outline', iconColor: '#bd93f9', iconBg: 'rgba(189,147,249,0.12)',   subtitle: 'Dark with purple accents',     preview: ['#1e1f29', '#2e3040', '#bd93f9'] },
  nord:       { icon: 'snow-outline',          iconColor: '#88c0d0', iconBg: 'rgba(136,192,208,0.12)',   subtitle: 'Arctic north-bluish palette',  preview: ['#2e3440', '#434c5e', '#88c0d0'] },
  adapta:     { icon: 'layers-outline',        iconColor: '#26c6da', iconBg: 'rgba(38,198,218,0.12)',    subtitle: 'Material dark teal',           preview: ['#1a1f24', '#2c3840', '#26c6da'] },
  slack:      { icon: 'chatbubbles-outline',   iconColor: '#ecb22e', iconBg: 'rgba(236,178,46,0.12)',    subtitle: 'Deep purple with gold accent', preview: ['#1a0d1b', '#4a154b', '#ecb22e'] },
  foxtow:     { icon: 'car-outline',           iconColor: '#d1130d', iconBg: 'rgba(209,19,13,0.12)',     subtitle: 'Brand theme · green & red',    preview: ['#00160a', '#003d18', '#d1130d'] },
  macintosh:  { icon: 'desktop-outline',       iconColor: '#0000aa', iconBg: 'rgba(0,0,170,0.10)',       subtitle: 'Classic Mac OS aesthetic',     preview: ['#c0c0c0', '#e0ddd6', '#0000aa'] },
  classic:    { icon: 'albums-outline',        iconColor: '#0054e3', iconBg: 'rgba(0,84,227,0.10)',      subtitle: 'Windows XP inspired',          preview: ['#eaeaea', '#ece9d8', '#0054e3'] },
  rosepine:   { icon: 'flower-outline',        iconColor: '#eb6f92', iconBg: 'rgba(235,111,146,0.12)',   subtitle: 'Dark mauve with pink accent',  preview: ['#191724', '#26233a', '#eb6f92'] },
  monokai:    { icon: 'code-slash-outline',    iconColor: '#a6e22e', iconBg: 'rgba(166,226,46,0.12)',    subtitle: 'Classic code editor theme',    preview: ['#1e1e1e', '#2f3029', '#a6e22e'] },
};

export default function ThemeScreen() {
  const insets = useSafeAreaInsets();
  const { themeId, setThemeId, C } = useAppTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        Choose how ProPhone looks on your device.
      </Text>

      <View style={styles.card}>
        {THEME_LIST.map((t, i) => {
          const meta = THEME_META[t.id];
          if (!meta) return null;
          const active = themeId === t.id;
          const isLast = i === THEME_LIST.length - 1;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.themeRow, isLast && styles.themeRowLast]}
              onPress={() => setThemeId(t.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.themeIcon, { backgroundColor: meta.iconBg }]}>
                <Ionicons name={meta.icon} size={20} color={meta.iconColor} />
              </View>

              <View style={styles.themeBody}>
                <Text style={styles.themeLabel}>{t.label}</Text>
                <Text style={styles.themeSub}>{meta.subtitle}</Text>
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

  subtitle: { color: C.textMuted, fontSize: 14, marginBottom: 20, lineHeight: 20 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 14,
  },
  themeRowLast: { borderBottomWidth: 0 },
  themeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  themeBody: { flex: 1 },
  themeLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  themeSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
});
