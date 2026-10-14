import { describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

import { signUpThroughOnboarding, type OwnerAccount } from './support/owner';

// sign-up, sign-in-reject and sign-in-existing against the local e2e deployment.
describe('sign-in with an account', { serial: true }, () => {
  let account: OwnerAccount;

  test('sign-up lands on onboarding and a profile opens Home', async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    account = await signUpThroughOnboarding(screen, device);
    await expect(screen.getByText('今日の散歩コースを提案します')).toBeVisible();
  });

  test('a wrong password shows the rejection and stays on the form', async ({
    app,
    device,
    screen,
  }) => {
    // The session token lives in the keychain, so clearing it signs the app out.
    await device.clearKeychain();
    await app.open();
    await screen.getByPlaceholder('メールアドレス').fill(account.email);
    await screen.getByPlaceholder('パスワード').fill('wrong-password');
    await screen.getByRole('button', 'ログイン').tap();
    await expect(screen.getByText('メールアドレスかパスワードが正しくありません')).toBeVisible();
    await expect(screen.getByRole('button', 'ログイン')).toBeVisible();
    await app.screenshot('sign-in-reject');
  });

  test('the right password opens Home for an Owner with a profile', async ({ app, screen }) => {
    await screen.getByPlaceholder('パスワード').fill(account.password);
    await screen.getByRole('button', 'ログイン').tap();
    await expect(screen.getByRole('button', 'コースを提案してもらう')).toBeVisible();
    await app.screenshot('sign-in-existing-home');
  });
});
