/**
 * Course Candidate building (ADR 0004): Start Point + target length in, provider-neutral
 * `Course`s out. Everything about OpenRouteService and Overpass stays in `./internal/`,
 * which nothing outside this directory may import; swapping to GraphHopper or a
 * self-hosted router touches only `./internal/ors.ts`.
 *
 * Usage (from convex/proposalRuns.ts):
 *   const built = await buildCourseCandidates({ start, targetLengthM });
 *   if (!built.ok) → record { type: 'failed', reason: built.reason }
 *
 * Hidden here: seeds, the "ask slightly shorter" factor, partial-failure tolerance,
 * the single Overpass query, geometry metrics, path simplification.
 *
 * Seeds are fixed (1..CANDIDATE_COUNT), so a retry with the same Start Point and length
 * asks ORS for the same loops: retries are repeatable and comparable.
 */
import type { LatLng } from '../domain/courseConditions';
import type { Course } from '../domain/proposal';
import { CANDIDATE_COUNT } from '../domain/tuning';

export type NonEmpty<T> = [T, ...T[]];

export type CourseBuildResult =
  | { ok: true; courses: NonEmpty<Course> }
  | { ok: false; reason: 'routingUnavailable' | 'noLoopFound' };

export async function buildCourseCandidates(input: {
  start: LatLng;
  targetLengthM: number;
}): Promise<CourseBuildResult> {
  void input;
  void CANDIDATE_COUNT;
  // TODO:
  //   1. loops = await Promise.allSettled(FIXED_SEEDS (1..CANDIDATE_COUNT).map(seed =>
  //        requestRoundTrip({ start, requestedLengthM: input.targetLengthM * REQUESTED_LENGTH_FACTOR, seed })));
  //      (internal/ors.ts; REQUESTED_LENGTH_FACTOR ≈ 0.85 because ORS loops come back longer)
  //   2. every rejection is RoutingUnavailable → { ok:false, 'routingUnavailable' };
  //      no fulfilled loop → { ok:false, 'noLoopFound' }.
  //   3. drop near-duplicate loops (same distance ±3% and >80% shared vertices).
  //   4. surroundings = await fetchSurroundings(boundingBox(all loop paths)) — ONE Overpass query;
  //      failure → null (courses still usable; Jev sees unknown shares).
  //   5. per loop: toCourse(loop, surroundings) (metrics.ts): shares + simplifyPath(≤ MAX_PATH_POINTS).
  throw new Error('not implemented');
}
