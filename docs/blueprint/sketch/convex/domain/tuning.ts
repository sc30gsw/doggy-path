import type { LengthClass, WalkingPace } from './walk';

export const CONDITION_CHECK_THRESHOLD = 0.6;

export const FIT_WEIGHTS = { body: 0.6, mood: 0.4 } as const;

export const CANDIDATE_COUNT = 5;
export const SHOWN_COURSE_COUNT = 3;

export const WALKING_PACE_KMH: Record<WalkingPace, number> = { slow: 3, normal: 4, brisk: 5 };

export const LENGTH_CLASSES: Record<LengthClass, { upToM: number | null; representativeM: number }> = {
  short: { upToM: 1_500, representativeM: 1_200 },
  normal: { upToM: 3_000, representativeM: 2_200 },
  long: { upToM: null, representativeM: 3_500 },
};

export const CALL_TIMEOUT_MS = { jev: 15_000, ors: 30_000, overpass: 25_000 } as const;

const SLOWEST_RUN_MS = CALL_TIMEOUT_MS.ors + CALL_TIMEOUT_MS.overpass + CALL_TIMEOUT_MS.jev;
export const RUN_TIMEOUT_MS = 2 * SLOWEST_RUN_MS;

export const PREVIOUS_START_POINT_LOOKBACK = 20;
