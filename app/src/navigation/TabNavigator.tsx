import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContactsStack from './ContactsStack';
import ProfileStack from './ProfileStack';
import MarketingStack from './MarketingStack';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.cardBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 10,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="Leads"
        component={ContactsStack}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={focused ? C.primary : C.textMuted}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Marketing"
        component={MarketingStack}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'megaphone' : 'megaphone-outline'}
              size={size}
              color={focused ? C.primary : C.textMuted}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={focused ? C.primary : C.textMuted}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
