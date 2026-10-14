import { beforeEach, describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

describe('app life cycle', () => {
  beforeEach(async ({ app, device }) => {
    await device.clearKeychain();
    await app.open();
  });

  test('returning from the home screen keeps the typed text', async ({ app, device, screen }) => {
    await screen.getByPlaceholder('メールアドレス').fill('owner@example.com');
    await device.home();
    await device.openApp('com.sc30gsw.doggy-path');
    await expect(screen.getByPlaceholder('メールアドレス')).toHaveValue('owner@example.com');
    await app.screenshot('app-lifecycle-after-foreground');
  });
});
