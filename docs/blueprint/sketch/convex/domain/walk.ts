import { v, type Infer } from 'convex/values';

import type { CourseConditions } from './courseConditions';
import { LENGTH_CLASSES, WALKING_PACE_KMH } from './tuning';

export const walkingPaceValidator = v.union(
  v.literal('slow'),
  v.literal('normal'),
  v.literal('brisk'),
);
export type WalkingPace = Infer<typeof walkingPaceValidator>;

export const lengthClassValidator = v.union(
  v.literal('short'),
  v.literal('normal'),
  v.literal('long'),
);
export type LengthClass = Infer<typeof lengthClassValidator>;

export const lengthDecisionValidator = v.union(
  v.object({ basis: v.literal('distance'), targetDistanceM: v.number() }),
  v.object({ basis: v.literal('time'), targetTimeMin: v.number() }),
  v.object({ basis: v.literal('judged'), lengthClass: lengthClassValidator }),
);
export type LengthDecision = Infer<typeof lengthDecisionValidator>;

export type LengthBasis = Exclude<LengthDecision, { basis: 'judged' }> | { basis: 'judged' };

export function lengthBasisOf(conditions: CourseConditions): LengthBasis {
  if (conditions.targetDistanceM !== undefined) {
    return { basis: 'distance', targetDistanceM: conditions.targetDistanceM };
  }
  if (conditions.targetTimeMin !== undefined) {
    return { basis: 'time', targetTimeMin: conditions.targetTimeMin };
  }
  return { basis: 'judged' };
}

export function targetLengthM({
  length,
  pace,
}: {
  length: LengthDecision;
  pace: WalkingPace;
}): number {
  switch (length.basis) {
    case 'distance':
      return length.targetDistanceM;
    case 'time':
      return (length.targetTimeMin / 60) * WALKING_PACE_KMH[pace] * 1000;
    case 'judged':
      return LENGTH_CLASSES[length.lengthClass].representativeM;
    default: {
      const _exhaustive: never = length;
      return _exhaustive;
    }
  }
}

const ESTIMATE_STEP_MIN = 5;

export function estimateMinutes({
  distanceM,
  pace,
}: {
  distanceM: number;
  pace: WalkingPace;
}): number {
  const minutes = (distanceM / 1000 / WALKING_PACE_KMH[pace]) * 60;
  const rounded = Math.round(minutes / ESTIMATE_STEP_MIN) * ESTIMATE_STEP_MIN;
  return Math.max(ESTIMATE_STEP_MIN, rounded);
}
