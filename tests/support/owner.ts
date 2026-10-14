import { randomUUID } from 'node:crypto';

import { expect } from 'e2e';
import type { Device } from '@e2e-dev/mobile';
import type { Screen } from 'e2e/engine';

const OWNER_NAME = 'Taro';
const DOG_NAME = 'Momo';

export type OwnerAccount = { email: string; password: string };

// The run's own local deployment receives these, so a throwaway password is enough and keeps
// screenshots available (a filled `Secret` withholds them for the rest of the test).
export async function signUpNewOwner(screen: Screen): Promise<OwnerAccount> {
  const account = { email: `owner-${randomUUID()}@example.com`, password: `pw-${randomUUID()}` };
  await screen.getByRole('button', 'アカウントを作る').tap();
  await screen.getByPlaceholder('メールアドレス').fill(account.email);
  await screen.getByPlaceholder('パスワード').fill(account.password);
  await screen.getByRole('button', '登録してはじめる').tap();
  // iOS offers to save the new password over onboarding; an Owner declines it with 今はしない.
  // A tap while the sheet is still sliding in is ignored, so tap until onboarding is back.
  const declineSave = screen.getByRole('button', '今はしない');
  await expect(declineSave).toBeVisible();
  await expect
    .poll(async () => {
      if ((await declineSave.count()) > 0) await declineSave.tap();
      return screen.getByRole('button', 'はじめる').count();
    })
    .toBe(1);
  return account;
}

export async function completeOnboarding(screen: Screen, device: Device): Promise<void> {
  // Both name fields share the placeholder and only rows on screen are matched, so start from
  // the top where the owner's comes first.
  await screen.scrollUntilVisible(screen.getByText('飼い主'), { direction: 'up' });
  const names = screen.getByPlaceholder('名前');
  await names.nth(0).fill(OWNER_NAME);
  await names.nth(1).fill(DOG_NAME);
  // The keyboard stays up across the breed sheet and would cover the sex picker.
  await device.dismissKeyboard();
  await screen.getByRole('button', '犬種を選ぶ').tap();
  await screen.getByPlaceholder('犬種を検索').fill('しば');
  await screen.getByRole('button', '柴').tap();
  await screen.getByRole('button', '選択').tap();
  await screen.getByRole('button', 'オス').tap();
  await screen.scrollUntilVisible(screen.getByRole('button', 'はじめる'));
  await screen.getByRole('button', 'はじめる').tap();
  await expect(screen.getByRole('button', 'コースを提案してもらう')).toBeVisible();
}

export async function signUpThroughOnboarding(
  screen: Screen,
  device: Device,
): Promise<OwnerAccount> {
  const account = await signUpNewOwner(screen);
  await completeOnboarding(screen, device);
  return account;
}

// The runner cannot confirm a fill into the number pads, and a number pad keeps focus on its
// field, so type into each and close the pad before the next.
export async function enterTargets(
  screen: Screen,
  device: Device,
  targets: { distanceKm: string; timeMin: string },
): Promise<void> {
  await screen.getByPlaceholder('距離 (km)').clear();
  await screen.getByPlaceholder('距離 (km)').pressSequentially(targets.distanceKm);
  await device.dismissKeyboard();
  await screen.getByPlaceholder('時間 (分)').clear();
  await screen.getByPlaceholder('時間 (分)').pressSequentially(targets.timeMin);
  await device.dismissKeyboard();
}

// The sheet ignores synthesized scrolls. Focusing 時間 (分) scrolls the list so the submit row
// stays above the keyboard, and it stays there once the pad closes.
export async function submitConditions(screen: Screen, device: Device): Promise<void> {
  await screen.getByPlaceholder('時間 (分)').tap();
  await device.dismissKeyboard();
  await screen.getByRole('button', 'この条件で提案').tap();
}
