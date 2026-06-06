import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../context/ThemeContext';
import MarketingHome from '../screens/marketing/MarketingHome';
import CampaignDetailScreen from '../screens/marketing/CampaignDetailScreen';
import DomainDetailScreen from '../screens/marketing/DomainDetailScreen';
import TemplateDetailScreen from '../screens/marketing/TemplateDetailScreen';
import type { Campaign, Domain, Template } from '../types/marketing';

export type MarketingStackParamList = {
  MarketingHome: undefined;
  CampaignDetail: { campaign: Campaign };
  DomainDetail: { domain: Domain };
  TemplateDetail: { template: Template };
};

const Stack = createNativeStackNavigator<MarketingStackParamList>();

export default function MarketingStack() {
  const { C } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen name="MarketingHome" component={MarketingHome} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <Stack.Screen name="DomainDetail" component={DomainDetailScreen} />
      <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
    </Stack.Navigator>
  );
}
