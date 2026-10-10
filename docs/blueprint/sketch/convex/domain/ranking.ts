/**
 * Ranking: stored Fit scores + weights in code → the ordered courses the Owner sees.
 *
 * Runs at READ time (inside `toProposalView`), never at write time. Consequences:
 * - Changing `FIT_WEIGHTS` or `SHOWN_COURSE_COUNT` (./tuning.ts) takes effect on the next deploy for
 *   every stored proposal, with no Jev call and no migration (spec step 6).
 * - The stored `CourseScoring` is the only fact; the order is always derived.
 */
import type { Course, CourseScoring, Fit } from './proposal';
import { FIT_WEIGHTS, SHOWN_COURSE_COUNT } from './tuning';

/** Which Fit earned a course its reason label. */
export type FitKind = keyof typeof FIT_WEIGHTS;

export type RankedCourses =
  | { order: 'recommended'; courses: Array<{ course: Course; reason: FitKind }> }
  | { order: 'byLength'; courses: Course[] };

/**
 * Pure. `byFit` → weighted score, descending; when `fit.mood` is null the score is
 * `fit.body` alone. `byLength` (Jev failed) → ascending |distanceM - targetLengthM|.
 * Ties break on `course.key` so the order is stable across reads.
 */
export function rankCourses(scoring: CourseScoring, targetLengthM: number): RankedCourses {
  void scoring;
  void targetLengthM;
  void weightedScore;
  void SHOWN_COURSE_COUNT;
  // TODO: sort as above, slice(0, SHOWN_COURSE_COUNT); for byFit attach
  //   reason = fit.mood !== null && fit.mood > fit.body ? 'mood' : 'body'
  //   (the higher of Body Fit / Mood Fit; body when Mood is absent or tied).
  throw new Error('not implemented');
}

/** Weighted score of one Fit. Private: tests go through `rankCourses`. */
function weightedScore(fit: Fit): number {
  void fit;
  // TODO: fit.mood === null ? fit.body : FIT_WEIGHTS.body * fit.body + FIT_WEIGHTS.mood * fit.mood
  throw new Error('not implemented');
}
