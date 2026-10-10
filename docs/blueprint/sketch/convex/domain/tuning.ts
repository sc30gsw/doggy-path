/**
 * Every number the product owner will tune, in one file. All are placeholders until
 * measured against real Jev, ORS and Overpass responses.
 *
 * Ranking reads `FIT_WEIGHTS` and `SHOWN_COURSE_COUNT` at READ time, so changing them
 * re-ranks every stored proposal on its next read: no Jev call, no migration (spec step 6).
 *
 * Provider-specific numbers (ORS's requested-length factor, Overpass proximity) are not
 * here: they stay inside `convex/courseBuilder/internal/` (ADR 0004).
 */
import type { LengthClass, WalkingPace } from './walk';

/** A Condition Check warning is raised when Jev's probability crosses this. */
export const CONDITION_CHECK_THRESHOLD = 0.6;

/** Body Fit vs Mood Fit. When the Owner gave no Mood, Body Fit alone decides. */
export const FIT_WEIGHTS = { body: 0.6, mood: 0.4 } as const;

/** Spec: build 5 Course Candidates, show the top 3. */
export const CANDIDATE_COUNT = 5;
export const SHOWN_COURSE_COUNT = 3;

/** Code, not Jev, owns the pace → speed mapping (spec step 3). */
export const WALKING_PACE_KMH: Record<WalkingPace, number> = { slow: 3, normal: 4, brisk: 5 };

/** Representative length for each class Jev may choose (short ≤ 1.5 km, normal 1.5–3 km, long 3 km+). */
export const LENGTH_CLASS_M: Record<LengthClass, number> = {
  short: 1_200,
  normal: 2_200,
  long: 3_500,
};

/**
 * Watchdog delay. A run that has not reported back by then is recorded as `timedOut`.
 * Must exceed worst-case 5 ORS calls + 1 Overpass query + 2 Jev requests.
 */
export const RUN_TIMEOUT_MS = 3 * 60 * 1000;
