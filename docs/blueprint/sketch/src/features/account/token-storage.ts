import type { TokenStorage } from '@convex-dev/auth/react';

export const tokenStorage: TokenStorage = {
  getItem: (key) => {
    void key;
    throw new Error('not implemented');
  },
  setItem: (key, value) => {
    void key;
    void value;
    throw new Error('not implemented');
  },
  removeItem: (key) => {
    void key;
    throw new Error('not implemented');
  },
};
