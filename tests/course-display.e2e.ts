import { describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

import { enterTargets, signUpThroughOnboarding, submitConditions } from './support/owner';

// Location is denied in the e2e config, so every proposal starts at the fallback point.
const START_POINT_NOTE = '東京駅から作りました';
// Routing can take up to 140 seconds before the ready card or a failure shows.
const BUILD_TIMEOUT = 150_000;
// display-working: the check, then the build, with the propose button hidden.
const WORKING = /条件を確認しています…|コースを作っています…/;
const SUMMARY = /km・\d+分$/;

describe('course display', { serial: true }, () => {
  test('display-idle: a new account sees the call to action', async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    await signUpThroughOnboarding(screen, device);
    await expect(screen.getByText('今日の散歩コースを提案します')).toBeVisible();
    await app.screenshot('course-display-idle');
  });

  // 時間 is in minutes: 10 km in 5 minutes is far past the 4 km/h pace, which targetsAreConsistent
  // flags on its own, before any LLM check.
  test('display-confirm: targets that do not fit ask for confirmation', async ({
    app,
    device,
    screen,
  }) => {
    await screen.getByRole('button', 'コースを提案してもらう').tap();
    await enterTargets(screen, device, { distanceKm: '10', timeMin: '5' });
    await submitConditions(screen, device);
    await expect(
      screen.getByText('距離と時間の組み合わせが合っていないかもしれません'),
    ).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByRole('button', 'このまま作る')).toBeVisible();
    await expect(screen.getByRole('button', '条件を変える')).toBeVisible();
    await expect(screen.getByRole('button', 'コースを提案してもらう')).toHaveCount(0);
    await app.screenshot('course-display-confirm');
  });

  test('conditions-revise: 条件を変える pre-fills and resubmits', async ({ device, screen }) => {
    await screen.getByRole('button', '条件を変える').tap();
    await expect(screen.getByPlaceholder('距離 (km)')).toHaveValue('10');
    await expect(screen.getByPlaceholder('時間 (分)')).toHaveValue('5');
    await submitConditions(screen, device);
    await expect(screen.getByRole('button', 'このまま作る')).toBeVisible({ timeout: 60_000 });
  });

  test('display-ready: このまま作る builds courses on the map card', async ({ app, screen }) => {
    await screen.getByRole('button', 'このまま作る').tap();
    await expect(screen.getByText(WORKING)).toBeVisible();
    await expect(screen.getByRole('button', '1')).toBeVisible({ timeout: BUILD_TIMEOUT });
    await expect(screen.getByText(SUMMARY)).toBeVisible();
    await expect(screen.getByText(START_POINT_NOTE)).toBeVisible();
    await expect(screen.getByRole('button', 'コースを提案してもらう')).toBeVisible();
    await app.screenshot('course-display-ready');
  });

  test('display-ready: another course number switches the summary', async ({ app, screen }) => {
    test.skip((await screen.getByRole('button', '2').count()) === 0, 'only one course was built');
    const first = await screen.getByText(SUMMARY).textContent();
    await screen.getByRole('button', '2').tap();
    await expect.poll(() => screen.getByText(SUMMARY).textContent()).not.toBe(first);
    await app.screenshot('course-display-second-course');
  });

  // 10 km in 150 minutes is exactly the 4 km/h pace: no confirmation, straight to building.
  test('a realistic 10 km walk skips the confirmation', async ({ app, device, screen }) => {
    await screen.getByRole('button', 'コースを提案してもらう').tap();
    await enterTargets(screen, device, { distanceKm: '10', timeMin: '150' });
    await submitConditions(screen, device);
    await expect(screen.getByText(WORKING)).toBeVisible();
    await expect(screen.getByRole('button', '1')).toBeVisible({ timeout: BUILD_TIMEOUT });
    await expect(screen.getByRole('button', 'このまま作る')).toHaveCount(0);
    await app.screenshot('course-display-realistic-build');
  });
});
