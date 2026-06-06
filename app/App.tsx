import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { ActiveClientProvider } from './src/context/ActiveClientContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { themeId } = useAppTheme();
  const isLight = themeId === 'light' || themeId === 'macintosh' || themeId === 'classic';
  return (
    <NavigationContainer>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ActiveClientProvider>
            <AppContent />
          </ActiveClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
