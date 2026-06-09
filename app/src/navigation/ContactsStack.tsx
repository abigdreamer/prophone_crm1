import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../context/ThemeContext';
import ContactDetailScreen from '../screens/ContactDetailScreen';
import ContactsScreen from '../screens/ContactsScreen';
import LeadFormScreen from '../screens/LeadFormScreen';
import type { Contact } from '../types/contact';

export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contact: Contact };
  LeadForm: { contact?: Contact };
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStack() {
  const { C } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: '',
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen
        name="ContactsList"
        component={ContactsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={({ route }) => ({
          title:
            `${route.params.contact.firstName} ${route.params.contact.lastName}`.trim() ||
            route.params.contact.company ||
            'Contact',
          headerBackTitle: 'Contacts',
        })}
      />
      <Stack.Screen
        name="LeadForm"
        component={LeadFormScreen}
        options={({ route }) =>({
          title: route.params?.contact ? 'Edit Lead' : 'Add New Lead',
          headerBackTitle: 'Back',
        })}
      />
    </Stack.Navigator>
  );
}
