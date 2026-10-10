/**
 * The whole route map and its access rules. Rendered by `src/app/_layout.tsx`.
 *
 *   signedOut    → sign-in
 *   needsProfile → onboarding          (the app is unusable until the Dog Profile exists)
 *   ready        → (tabs) [Home, Profile], conditions (form sheet)
 *
 * There is no proposal route: Home shows the Owner's current proposal (`useProposal`).
 *
 * `Stack.Protected` redirects automatically when the guard flips (sign-in completes,
 * onboarding saves, sign-out), so screens never navigate for auth reasons themselves.
 */
import { Stack } from 'expo-router';
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
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }}
        />
      </Stack.Protected>
    </Stack>
  );
}
