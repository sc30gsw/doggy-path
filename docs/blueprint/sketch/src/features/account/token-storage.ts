/**
 * Convex Auth token storage for React Native (required: there is no localStorage).
 * Dependency to add in Feature 1: `bunx expo install expo-secure-store`.
 */
import type { TokenStorage } from '@convex-dev/auth/react';

export const tokenStorage: TokenStorage = {
  getItem: (key) => {
    void key;
    // TODO: SecureStore.getItemAsync(key)
    throw new Error('not implemented');
  },
  setItem: (key, value) => {
    void key;
    void value;
    // TODO: SecureStore.setItemAsync(key, value)
    throw new Error('not implemented');
  },
  removeItem: (key) => {
    void key;
    // TODO: SecureStore.deleteItemAsync(key)
    throw new Error('not implemented');
  },
};
