import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/features/account/app-providers';
import { RootStack } from '@/features/account/root-stack';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
