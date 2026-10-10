import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useSession } from './use-session';

export function RootStack() {
  const session = useSession();

  useEffect(() => {
    if (session.kind !== 'loading') void SplashScreen.hideAsync();
  }, [session.kind]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session.kind === 'signedOut'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={session.kind === 'needsProfile'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={session.kind === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="conditions"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.92],
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
