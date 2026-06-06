import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
  minWidth?: number;
};

export default function StatCard({ label, value, subtitle, accentColor = '#6b7280', minWidth = 100 }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor, minWidth }]}>
      <Text style={[styles.value, { color: accentColor === '#ffffff' || accentColor === '#f1f5f9' ? '#ffffff' : accentColor }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1d27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d3a',
    borderLeftWidth: 3,
    padding: 14,
    marginRight: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 3,
  },
});
