import type { LatLng } from '../domain/courseConditions';
import type { Course } from '../domain/proposal';
import { CANDIDATE_COUNT } from '../domain/tuning';
import { ROUND_TRIP_OVERSHOOT_COMPENSATION, requestRoundTrip } from './internal/ors';

export type NonEmpty<T> = [T, ...T[]];

export type CourseBuildResult =
  | { ok: true; courses: NonEmpty<Course> }
  | { ok: false; reason: 'routingUnavailable' | 'noLoopFound' };

const FIXED_SEEDS = Array.from({ length: CANDIDATE_COUNT }, (_, index) => index + 1);

export async function buildCourseCandidates({
  start,
  targetLengthM,
}: {
  start: LatLng;
  targetLengthM: number;
}): Promise<CourseBuildResult> {
  void start;
  void targetLengthM;
  void FIXED_SEEDS;
  void ROUND_TRIP_OVERSHOOT_COMPENSATION;
  void requestRoundTrip;
  throw new Error('not implemented');
}
