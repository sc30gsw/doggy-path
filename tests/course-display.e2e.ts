import { describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

import {
  COURSE_BUILD_TEST,
  LONG_WALK_TARGETS,
  TOO_FAST_TARGETS,
  enterTargets,
  expectCoursesBuilt,
  signUpThroughOnboarding,
  submitConditions,
  waitForConfirmationOrCourses,
} from './support/owner';

const START_POINT_NOTE = '東京駅から作りました';
const SUMMARY = /km・\d+分$/;

describe('course display', { serial: true }, () => {
  test('display-idle: a new account sees the call to action', async ({ app, device, screen }) => {
    await device.clearKeychain();
    await app.open();
    await signUpThroughOnboarding(screen, device);
    await expect(screen.getByText('今日の散歩コースを提案します')).toBeVisible();
    await app.screenshot('course-display-idle');
  });

  test('display-confirm: targets that do not fit ask for confirmation', async ({
    app,
    device,
    screen,
  }) => {
    await screen.getByRole('button', 'コースを提案してもらう').tap();
    await enterTargets(screen, device, TOO_FAST_TARGETS);
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

  test(
    'display-ready: このまま作る builds courses on the map card',
    COURSE_BUILD_TEST,
    async ({ app, screen }) => {
      await screen.getByRole('button', 'このまま作る').tap();
      await expectCoursesBuilt(screen);
      await expect(screen.getByText(SUMMARY)).toBeVisible();
      await expect(screen.getByText(START_POINT_NOTE)).toBeVisible();
      await expect(screen.getByRole('button', 'コースを提案してもらう')).toBeVisible();
      await app.screenshot('course-display-ready');
    },
  );

  test('display-ready: another course number keeps the card on screen', async ({ app, screen }) => {
    test.skip((await screen.getByRole('button', '2').count()) === 0, 'only one course was built');
    await screen.getByRole('button', '2').tap();
    await expect(screen.getByText(SUMMARY)).toBeVisible();
    await app.screenshot('course-display-second-course');
  });

  test(
    'a realistic 10 km walk raises no pace warning and builds courses',
    COURSE_BUILD_TEST,
    async ({ app, device, screen }) => {
      await screen.getByRole('button', 'コースを提案してもらう').tap();
      await enterTargets(screen, device, LONG_WALK_TARGETS);
      await submitConditions(screen, device);
      await waitForConfirmationOrCourses(screen);
      await expect(
        screen.getByText('距離と時間の組み合わせが合っていないかもしれません'),
      ).toHaveCount(0);
      // The LLM load check may still judge 10 km too much for the dog; the Owner then proceeds.
      const proceed = screen.getByRole('button', 'このまま作る');
      if ((await proceed.count()) > 0) {
        await proceed.tap();
        await expectCoursesBuilt(screen);
      }
      await expect(screen.getByRole('button', '1')).toBeVisible();
      await app.screenshot('course-display-realistic-build');
    },
  );
});
