import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test(
  'the signed-out app shows the sign-in form',
  { tags: ['smoke'] },
  async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    await expect(screen.getByRole('button', 'ログイン')).toBeVisible();
    await expect(screen.getByRole('button', 'アカウントを作る')).toBeVisible();
  },
);
