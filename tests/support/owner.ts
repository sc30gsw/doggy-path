import { randomUUID } from 'node:crypto';

import { expect } from 'e2e';
import type { Device } from '@e2e-dev/mobile';
import type { Screen } from 'e2e/engine';

import type { ConditionsDraft } from '../../src/features/course-conditions/conditions-draft';

const OWNER_NAME = 'Taro';
const DOG_NAME = 'Momo';

export type OwnerAccount = { email: string; password: string };

// What an Owner types into the sheet: the form's own draft fields.
type Targets = Pick<ConditionsDraft, 'targetDistanceKm' | 'targetTimeMin'>;

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
  await screen.scrollUntilVisible(screen.getByText('飼い主'), { direction: 'up' });
  const names = screen.getByPlaceholder('名前');
  await names.nth(0).fill(OWNER_NAME);
  await names.nth(1).fill(DOG_NAME);
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
  targets: Targets,
): Promise<void> {
  await screen.getByPlaceholder('距離 (km)').clear();
  await screen.getByPlaceholder('距離 (km)').pressSequentially(targets.targetDistanceKm);
  await device.dismissKeyboard();
  await screen.getByPlaceholder('時間 (分)').clear();
  await screen.getByPlaceholder('時間 (分)').pressSequentially(targets.targetTimeMin);
  await device.dismissKeyboard();
}

// The sheet ignores synthesized scrolls. Focusing 時間 (分) scrolls the list so the submit row
// stays above the keyboard, and it stays there once the pad closes.
export async function submitConditions(screen: Screen, device: Device): Promise<void> {
  await screen.getByPlaceholder('時間 (分)').tap();
  await device.dismissKeyboard();
  await screen.getByRole('button', 'この条件で提案').tap();
}

export const OUT_OF_RANGE_TARGETS = {
  targetDistanceKm: '0.1',
  targetTimeMin: '4',
} as const satisfies Targets;
export const WALKING_PACE_TARGETS = {
  targetDistanceKm: '3',
  targetTimeMin: '45',
} as const satisfies Targets;
export const TOO_FAST_TARGETS = {
  targetDistanceKm: '10',
  targetTimeMin: '5',
} as const satisfies Targets;
export const LONG_WALK_TARGETS = {
  targetDistanceKm: '10',
  targetTimeMin: '150',
} as const satisfies Targets;

const BUILD_TIMEOUT = 150_000;
const STEPS_AROUND_BUILD_TIMEOUT = 90_000;
export const COURSE_BUILD_TEST = { timeout: BUILD_TIMEOUT + STEPS_AROUND_BUILD_TIMEOUT } as const;
const WORKING = /条件を確認しています…|コースを作っています…/;

export async function expectCoursesBuilt(screen: Screen): Promise<void> {
  await expect(screen.getByText(WORKING)).toBeVisible();
  await expect(screen.getByRole('button', '1')).toBeVisible({ timeout: BUILD_TIMEOUT });
}
