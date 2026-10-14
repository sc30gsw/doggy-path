import { describe, test, type Device } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import type { Screen } from 'e2e/engine';

import {
  COURSE_BUILD_TEST,
  OUT_OF_RANGE_TARGETS,
  WALKING_PACE_TARGETS,
  enterTargets,
  expectCoursesBuilt,
  signUpThroughOnboarding,
  submitConditions,
} from './support/owner';

async function submitAndExpectCourses(screen: Screen, device: Device): Promise<void> {
  await submitConditions(screen, device);
  await expect(screen.getByRole('button', 'この条件で提案')).toHaveCount(0);
  await expectCoursesBuilt(screen);
}

describe('course conditions', { serial: true }, () => {
  test('conditions-open: the sheet opens blank from Home', async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    await signUpThroughOnboarding(screen, device);

    await screen.getByRole('button', 'コースを提案してもらう').tap();
    await expect(screen.getByText('今日の気分')).toBeVisible();
    await expect(screen.getByText('目安')).toBeVisible();
    await expect(screen.getByText('開始地点')).toBeVisible();
    await expect(screen.getByRole('radio', /のんびり/)).toBeVisible();
    await expect(screen.getByPlaceholder('距離 (km)')).toHaveValue('');
    await expect(screen.getByPlaceholder('時間 (分)')).toHaveValue('');
    await app.screenshot('course-conditions-blank-sheet');
  });

  test(
    'conditions-filled: a mood and consistent targets close the sheet',
    COURSE_BUILD_TEST,
    async ({ app, device, screen }) => {
      await screen.scrollUntilVisible(screen.getByRole('radio', /のんびり/), { direction: 'up' });
      await screen.getByRole('radio', /のんびり/).tap();
      await enterTargets(screen, device, WALKING_PACE_TARGETS);
      await app.screenshot('course-conditions-filled-sheet');
      await submitAndExpectCourses(screen, device);
      await app.screenshot('course-conditions-filled-accepted');
    },
  );

  test(
    'conditions-empty: a blank request is accepted too',
    COURSE_BUILD_TEST,
    async ({ app, device, screen }) => {
      await screen.getByRole('button', 'コースを提案してもらう').tap();
      await expect(screen.getByPlaceholder('距離 (km)')).toHaveValue('');
      await submitAndExpectCourses(screen, device);
      await app.screenshot('course-conditions-empty-accepted');
    },
  );

  test('out-of-range targets keep the sheet open', async ({ app, device, screen }) => {
    await screen.getByRole('button', 'コースを提案してもらう').tap();
    await enterTargets(screen, device, OUT_OF_RANGE_TARGETS);
    await submitConditions(screen, device);
    await expect(screen.getByText('距離は0.2〜20kmで入力してください')).toBeVisible();
    await expect(screen.getByText('時間は5〜240分で入力してください')).toBeVisible();
    await expect(screen.getByPlaceholder('距離 (km)')).toBeVisible();
    await app.screenshot('course-conditions-range-errors');
  });
});
