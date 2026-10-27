import { describe, expect, test } from 'bun:test';

import { LENGTH_CLASSES, TARGETS_PACE_RATIO_LIMIT, WALKING_PACE_KMH } from './tuning';
import { estimateMinutes, targetLengthM, targetsAreConsistent, type WalkingPace } from './walk';

const pace: WalkingPace = 'normal';

function distanceForMinutes(minutes: number, walkingPace: WalkingPace): number {
  return (minutes / 60) * WALKING_PACE_KMH[walkingPace] * 1000;
}

describe('targetLengthM', () => {
  test('a requested distance is the target, whatever the pace', () => {
    expect(
      targetLengthM({ length: { basis: 'distance', targetDistanceM: 1_800 }, pace: 'slow' }),
    ).toBe(1_800);
  });

  test('a requested time becomes a length at that pace', () => {
    const targetTimeMin = 30;
    expect(targetLengthM({ length: { basis: 'time', targetTimeMin }, pace: 'brisk' })).toBe(
      (targetTimeMin / 60) * WALKING_PACE_KMH.brisk * 1000,
    );
  });

  test('a judged class uses the representative length, not the pace', () => {
    expect(targetLengthM({ length: { basis: 'judged', lengthClass: 'long' }, pace: 'slow' })).toBe(
      LENGTH_CLASSES.long.representativeM,
    );
  });
});

describe('targetsAreConsistent', () => {
  test('the implied pace may differ from the walking pace up to the ratio limit, inclusive', () => {
    const targetTimeMin = 60;
    const atRatio = (ratio: number) =>
      targetsAreConsistent({
        targetDistanceM: distanceForMinutes(targetTimeMin, pace) * ratio,
        targetTimeMin,
        pace,
      });

    expect(atRatio(1)).toBe(true);
    expect(atRatio(TARGETS_PACE_RATIO_LIMIT)).toBe(true);
    expect(atRatio(1 / TARGETS_PACE_RATIO_LIMIT)).toBe(true);
    expect(atRatio(TARGETS_PACE_RATIO_LIMIT + 0.01)).toBe(false);
    expect(atRatio(1 / TARGETS_PACE_RATIO_LIMIT - 0.01)).toBe(false);
  });
});

describe('estimateMinutes', () => {
  test('rounds the pace conversion to five minutes and never below five', () => {
    expect(estimateMinutes({ distanceM: distanceForMinutes(15, pace), pace })).toBe(15);
    expect(estimateMinutes({ distanceM: distanceForMinutes(7.5, pace), pace })).toBe(10);
    expect(estimateMinutes({ distanceM: distanceForMinutes(6, pace), pace })).toBe(5);
    expect(estimateMinutes({ distanceM: 0, pace })).toBe(5);
  });
});
