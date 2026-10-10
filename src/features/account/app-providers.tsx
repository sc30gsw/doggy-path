import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { tokenStorage } from './token-storage';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set. Run `bunx convex dev` to write it to .env.local.',
  );
}

const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false });

export function AppProviders({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  return (
    <ConvexAuthProvider client={convex} storage={tokenStorage}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {children}
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}
