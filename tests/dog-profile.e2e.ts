import { describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

import { completeOnboarding, signUpNewOwner } from './support/owner';

describe('dog profile', { serial: true }, () => {
  test('a new account lands on onboarding', async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    await signUpNewOwner(screen);
    await expect(screen.getByText('飼い主')).toBeVisible();
    await expect(screen.getByText('わんちゃん')).toBeVisible();
    await app.screenshot('dog-profile-onboarding');
  });

  test('onboarding names every missing field', async ({ app, screen }) => {
    await screen.scrollUntilVisible(screen.getByRole('button', 'はじめる'));
    await screen.getByRole('button', 'はじめる').tap();
    await expect(screen.getByText('飼い主の名前を入力してください')).toBeVisible();
    await expect(screen.getByText('わんちゃんの名前を入力してください')).toBeVisible();
    await expect(screen.getByText('犬種を選んでください')).toBeVisible();
    await expect(screen.getByText('性別を選んでください')).toBeVisible();
    await screen.scrollUntilVisible(screen.getByText('入力内容を確認してください'));
    await app.screenshot('dog-profile-onboarding-errors');
  });

  test('a complete profile opens Home', async ({ app, device, screen }) => {
    await completeOnboarding(screen, device);
    await expect(screen.getByText('今日の散歩コースを提案します')).toBeVisible();
    await app.screenshot('dog-profile-home');
  });

  // The multiline メモ cannot be cleared by the runner, so the edit goes through 体重 (kg).
  test('a saved weight is still there after a relaunch', async ({ app, device, screen }) => {
    await screen.getByText('プロフィール').tap();
    await screen.scrollUntilVisible(screen.getByRole('button', '保存する'));
    await screen.getByPlaceholder('体重 (kg)').fill('8.5');
    await device.dismissKeyboard();
    await screen.getByRole('button', '保存する').tap();
    await expect(screen.getByText('保存しました')).toBeVisible();

    await app.open();
    await screen.getByText('プロフィール').tap();
    await screen.scrollUntilVisible(screen.getByPlaceholder('体重 (kg)'));
    await expect(screen.getByPlaceholder('体重 (kg)')).toHaveValue('8.5');
    await app.screenshot('dog-profile-weight-after-relaunch');
  });

  test('その他 adds a free-text breed field', async ({ screen }) => {
    await screen.scrollUntilVisible(screen.getByRole('button', '柴'), { direction: 'up' });
    await screen.getByRole('button', '柴').tap();
    await screen.getByPlaceholder('犬種を検索').fill('その他');
    await screen.getByRole('button', 'その他').tap();
    await expect(screen.getByPlaceholder('犬種')).toBeVisible();
  });

  test('サインアウト returns to the sign-in form', async ({ screen }) => {
    // The last group ends under the floating tab bar until the form is pushed past its end.
    await screen.getByRole('button', '保存する').swipe({ direction: 'up' });
    await screen.getByRole('button', 'サインアウト').tap();
    await expect(screen.getByRole('button', 'ログイン')).toBeVisible();
  });
});
