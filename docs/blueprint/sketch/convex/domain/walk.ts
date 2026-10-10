/**
 * Walking Pace and course-length policy: how a proposal turns Course Conditions into
 * one target length in metres, and how a distance becomes a time estimate.
 *
 * Shared with the client (the time estimate is computed in the proposal view, server-side,
 * but the types are visible to the client through `ProposalView`).
 */
import { v, type Infer } from 'convex/values';

import type { CourseConditions } from './courseConditions';
import { LENGTH_CLASS_M, WALKING_PACE_KMH } from './tuning';

export const walkingPaceValidator = v.union(
  v.literal('slow'),
  v.literal('normal'),
  v.literal('brisk'),
);
export type WalkingPace = Infer<typeof walkingPaceValidator>;

export const lengthClassValidator = v.union(
  v.literal('short'), // ≤ 1.5 km
  v.literal('normal'), // 1.5–3 km
  v.literal('long'), // 3 km+
);
export type LengthClass = Infer<typeof lengthClassValidator>;

/**
 * Why the target length is what it is. Stored inside the Assessment so a resumed
 * proposal ("このまま作る", retry) never asks Jev again.
 * The variant is decided by which targets the Owner entered (see `lengthBasisOf`);
 * only the `judged` variant carries a Jev answer.
 */
export const lengthDecisionValidator = v.union(
  v.object({ basis: v.literal('distance'), targetDistanceM: v.number() }),
  v.object({ basis: v.literal('time'), targetTimeMin: v.number() }),
  v.object({ basis: v.literal('judged'), lengthClass: lengthClassValidator }),
);
export type LengthDecision = Infer<typeof lengthDecisionValidator>;

/** A LengthDecision before Jev has answered: `judged` has no class yet. */
export type LengthBasis = Exclude<LengthDecision, { basis: 'judged' }> | { basis: 'judged' };

/**
 * Which length basis the conditions call for. Distance wins over time (spec step 3).
 * `judged` means: the Condition Check request must include the length-class Choice.
 */
export function lengthBasisOf(conditions: CourseConditions): LengthBasis {
  if (conditions.targetDistanceM !== undefined) {
    return { basis: 'distance', targetDistanceM: conditions.targetDistanceM };
  }
  if (conditions.targetTimeMin !== undefined) {
    return { basis: 'time', targetTimeMin: conditions.targetTimeMin };
  }
  return { basis: 'judged' };
}

/** The one place a target length in metres is computed. Derived, never stored. */
export function targetLengthM(length: LengthDecision, pace: WalkingPace): number {
  void length;
  void pace;
  void LENGTH_CLASS_M;
  // TODO: distance → targetDistanceM;
  //       time → targetTimeMin / 60 * WALKING_PACE_KMH[pace] * 1000;
  //       judged → LENGTH_CLASS_M[lengthClass].
  throw new Error('not implemented');
}

/** Time estimate shown with each course: distance at this dog's Walking Pace, rounded to 5 min. */
export function estimateMinutes(distanceM: number, pace: WalkingPace): number {
  void distanceM;
  void pace;
  void WALKING_PACE_KMH;
  // TODO: Math.max(5, round5(distanceM / 1000 / WALKING_PACE_KMH[pace] * 60)).
  throw new Error('not implemented');
}
