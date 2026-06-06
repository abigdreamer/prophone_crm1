import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../context/ThemeContext';
import ProfileScreen from '../screens/ProfileScreen';
import MyProfileScreen from '../screens/profile/MyProfileScreen';
import LanguageScreen from '../screens/profile/LanguageScreen';
import ThemeScreen from '../screens/profile/ThemeScreen';
import AccountSettingsScreen from '../screens/profile/AccountSettingsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  MyProfile: undefined;
  Language: undefined;
  Theme: undefined;
  AccountSettings: undefined;
  NotificationsSettings: undefined;
  PrivacyAndSecurity: undefined;
  HelpAndSupport: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  const { C } = useAppTheme();

  const headerOptions = {
    headerStyle: { backgroundColor: C.surface },
    headerTintColor: C.text,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
    headerShadowVisible: false,
    headerBackTitle: '',
    contentStyle: { backgroundColor: C.bg },
  };

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ title: 'Language' }} />
      <Stack.Screen name="Theme" component={ThemeScreen} options={{ title: 'Theme' }} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: 'Account Settings' }} />
      <Stack.Screen name="NotificationsSettings" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="PrivacyAndSecurity" component={PrivacyScreen} options={{ title: 'Privacy & Security' }} />
      <Stack.Screen name="HelpAndSupport" component={HelpSupportScreen} options={{ title: 'Help & Support' }} />
    </Stack.Navigator>
  );
}
