import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BadgeStatus =
  | 'draft' | 'sending' | 'sent' | 'paused' | 'canceled'
  | 'verified' | 'failed' | 'pending'
  | 'published'
  | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'skipped' | 'unsubscribed';

type Config = { label: string; bg: string; color: string; icon?: React.ComponentProps<typeof Ionicons>['name'] };

const CONFIGS: Record<BadgeStatus, Config> = {
  // Campaign statuses
  draft:        { label: 'DRAFT',      bg: 'rgba(100,116,139,0.18)', color: '#94a3b8' },
  sending:      { label: 'SENDING',    bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', icon: 'radio-button-on' },
  sent:         { label: 'SENT',       bg: 'rgba(16,185,129,0.18)',  color: '#10b981', icon: 'checkmark-circle' },
  paused:       { label: 'PAUSED',     bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', icon: 'pause-circle' },
  canceled:     { label: 'CANCELED',   bg: 'rgba(239,68,68,0.18)',   color: '#ef4444', icon: 'close-circle' },
  // Domain statuses
  verified:     { label: 'VERIFIED',   bg: 'rgba(16,185,129,0.18)',  color: '#10b981', icon: 'shield-checkmark' },
  failed:       { label: 'FAILED',     bg: 'rgba(239,68,68,0.18)',   color: '#ef4444', icon: 'close-circle' },
  pending:      { label: 'PENDING',    bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', icon: 'time-outline' },
  // Template statuses
  published:    { label: 'PUBLISHED',  bg: 'rgba(16,185,129,0.18)',  color: '#10b981' },
  // Recipient statuses
  delivered:    { label: 'DELIVERED',  bg: 'rgba(59,130,246,0.18)',  color: '#3b82f6' },
  opened:       { label: 'OPENED',     bg: 'rgba(139,92,246,0.18)',  color: '#8b5cf6' },
  clicked:      { label: 'CLICKED',    bg: 'rgba(16,185,129,0.18)',  color: '#10b981' },
  bounced:      { label: 'BOUNCED',    bg: 'rgba(239,68,68,0.18)',   color: '#ef4444' },
  skipped:      { label: 'SKIPPED',    bg: 'rgba(100,116,139,0.18)', color: '#94a3b8' },
  unsubscribed: { label: 'UNSUB',      bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b' },
};

type Props = {
  status: BadgeStatus;
  size?: 'sm' | 'md';
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIGS[status] ?? CONFIGS.pending;
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSmall && styles.badgeSm]}>
      {cfg.icon && (
        <Ionicons name={cfg.icon} size={isSmall ? 9 : 11} color={cfg.color} style={{ marginRight: 3 }} />
      )}
      <Text style={[styles.label, { color: cfg.color }, isSmall && styles.labelSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  labelSm: { fontSize: 9 },
});
