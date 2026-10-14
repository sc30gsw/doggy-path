import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

// Doctor: the dev build loads this run's Metro bundle and the signed-out landmark renders.
test(
  'the signed-out app shows the sign-in form',
  { tags: ['smoke'] },
  async ({ app, device, screen }) => {
    // The Convex Auth token lives in the keychain; clearing it starts signed out.
    await device.clearKeychain();
    await app.open();
    await expect(screen.getByRole('button', 'ログイン')).toBeVisible();
    await expect(screen.getByRole('button', 'アカウントを作る')).toBeVisible();
  },
);
