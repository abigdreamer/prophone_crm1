import { useAuth } from '../context/AuthContext';
import LoadingSplash from '../components/LoadingSplash';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';

export default function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSplash />;
  }

  return token ? <TabNavigator /> : <LoginScreen />;
}
