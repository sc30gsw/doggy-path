import { beforeEach, describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

describe('sign-in validation', () => {
  beforeEach(async ({ app, device }) => {
    await device.clearKeychain();
    await app.open();
  });

  test('a short password shows the length error and stays on the form', async ({ screen }) => {
    await screen.getByPlaceholder('メールアドレス').fill('owner@example.com');
    await screen.getByPlaceholder('パスワード').fill('short');
    await screen.getByRole('button', 'ログイン').tap();
    await expect(screen.getByText('パスワードは8文字以上にしてください')).toBeVisible();
    await expect(screen.getByRole('button', 'ログイン')).toBeVisible();
  });

  test('a malformed email shows the format error first', async ({ screen }) => {
    await screen.getByPlaceholder('メールアドレス').fill('not-an-email');
    await screen.getByPlaceholder('パスワード').fill('short');
    await screen.getByRole('button', 'ログイン').tap();
    await expect(screen.getByText('メールアドレスの形式が正しくありません')).toBeVisible();
    await expect(screen.getByText('パスワードは8文字以上にしてください')).toHaveCount(0);
  });

  test('switching to sign-up relabels the form and clears the error', async ({ screen }) => {
    await screen.getByRole('button', 'ログイン').tap();
    await expect(screen.getByText('メールアドレスの形式が正しくありません')).toBeVisible();
    await screen.getByRole('button', 'アカウントを作る').tap();
    await expect(screen.getByRole('button', '登録してはじめる')).toBeVisible();
    await expect(screen.getByRole('button', 'ログインに戻る')).toBeVisible();
    await expect(screen.getByText('メールアドレスの形式が正しくありません')).toHaveCount(0);
  });
});
