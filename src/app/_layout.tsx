import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { AppProviders } from '@/features/account/app-providers';
import { RootStack } from '@/features/account/root-stack';

enableScreens();

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <RootStack />
      </AppProviders>
    </SafeAreaProvider>
  );
}
