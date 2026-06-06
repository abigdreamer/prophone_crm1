import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../context/ThemeContext';
import { useActiveClient } from '../../context/ActiveClientContext';
import CampaignsScreen from './CampaignsScreen';
import TemplatesScreen from './TemplatesScreen';
import DomainsScreen from './DomainsScreen';
import type { MarketingStackParamList } from '../../navigation/MarketingStack';

type Props = {
  navigation: NativeStackNavigationProp<MarketingStackParamList, 'MarketingHome'>;
};

const TABS = [
  { label: 'Campaigns', icon: 'megaphone-outline' as const },
  { label: 'Templates', icon: 'document-text-outline' as const },
  { label: 'Domains',   icon: 'globe-outline' as const },
];

export default function MarketingHome({ navigation }: Props) {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { activeClient } = useActiveClient();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      {/* Active client pill — read-only indicator */}
      {activeClient && (
        <View style={[styles.clientBar, { borderBottomColor: C.cardBorder }]}>
          <Ionicons name="business-outline" size={12} color={C.primary} />
          <Text style={[styles.clientBarLabel, { color: C.textMuted }]}>CLIENT</Text>
          <View style={[styles.clientBadge, { backgroundColor: C.primaryDim }]}>
            <View style={[styles.clientDot, { backgroundColor: C.primary }]} />
            <Text style={[styles.clientBadgeText, { color: C.primaryLight }]} numberOfLines={1}>
              {activeClient.name}
            </Text>
          </View>
        </View>
      )}

      {/* Sub-tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: C.cardBorder }]}>
        {TABS.map((tab, i) => {
          const active = activeTab === i;
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.tab}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={14} color={active ? C.primary : C.textMuted} />
              <Text style={[styles.tabText, { color: active ? C.primary : C.textMuted, fontWeight: active ? '700' : '500' }]}>
                {tab.label}
              </Text>
              {active && <View style={[styles.tabIndicator, { backgroundColor: C.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 0 && <CampaignsScreen navigation={navigation} />}
        {activeTab === 1 && <TemplatesScreen navigation={navigation} />}
        {activeTab === 2 && <DomainsScreen navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clientBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 6, borderBottomWidth: 1 },
  clientBarLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  clientBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 5, marginLeft: 4 },
  clientDot: { width: 6, height: 6, borderRadius: 3 },
  clientBadgeText: { fontSize: 12, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 5, position: 'relative' },
  tabText: { fontSize: 13 },
  tabIndicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, borderRadius: 2 },
  content: { flex: 1 },
});
