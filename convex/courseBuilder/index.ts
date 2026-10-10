import type { LatLng } from '../domain/courseConditions';
import type { Course } from '../domain/proposal';
import { CANDIDATE_COUNT } from '../domain/tuning';
import { boundingBoxOf, toCourse } from './internal/metrics';
import {
  ROUND_TRIP_OVERSHOOT_COMPENSATION,
  requestRoundTrip,
  type RoutedLoop,
} from './internal/ors';
import { fetchSurroundings } from './internal/overpass';

export type NonEmpty<T> = [T, ...T[]];

export type CourseBuildResult =
  | { ok: true; courses: NonEmpty<Course> }
  | { ok: false; reason: 'routingUnavailable' | 'noLoopFound' };

const FIXED_SEEDS = Array.from({ length: CANDIDATE_COUNT }, (_, index) => index + 1);
const DUPLICATE_DISTANCE_RATIO = 0.03;
const DUPLICATE_VERTEX_SHARE = 0.8;
const VERTEX_MATCH_M = 15;

export async function buildCourseCandidates({
  start,
  targetLengthM,
}: {
  start: LatLng;
  targetLengthM: number;
}): Promise<CourseBuildResult> {
  const results = await Promise.all(
    FIXED_SEEDS.map((seed) =>
      requestRoundTrip({
        start,
        requestedLengthM: targetLengthM * ROUND_TRIP_OVERSHOOT_COMPENSATION,
        seed,
      }),
    ),
  );
  if (results.every((result) => result.kind === 'unavailable')) {
    return { ok: false, reason: 'routingUnavailable' };
  }
  const loops = results.flatMap((result) => (result.kind === 'loop' ? [result.loop] : []));
  const unique = dropNearDuplicates(loops);
  if (unique.length === 0) return { ok: false, reason: 'noLoopFound' };
  const surroundings = await fetchSurroundings(boundingBoxOf(unique.map((loop) => loop.path)));
  const courses = unique.map((loop) => toCourse({ loop, surroundings }));
  const head = courses[0];
  if (!head) return { ok: false, reason: 'noLoopFound' };
  return { ok: true, courses: [head, ...courses.slice(1)] };
}

function dropNearDuplicates(loops: RoutedLoop[]): RoutedLoop[] {
  const kept: RoutedLoop[] = [];
  for (const loop of loops) {
    if (!kept.some((existing) => nearDuplicate(existing, loop))) kept.push(loop);
  }
  return kept;
}

function nearDuplicate(left: RoutedLoop, right: RoutedLoop): boolean {
  const ratio =
    left.distanceM === 0 ? 1 : Math.abs(left.distanceM - right.distanceM) / left.distanceM;
  return (
    ratio <= DUPLICATE_DISTANCE_RATIO &&
    sharedVertexShare(left.path, right.path) > DUPLICATE_VERTEX_SHARE
  );
}

function sharedVertexShare(left: readonly LatLng[], right: readonly LatLng[]): number {
  if (left.length === 0) return 0;
  const shared = left.filter((point) =>
    right.some((other) => withinMeters(point, other, VERTEX_MATCH_M)),
  ).length;
  return shared / left.length;
}

function withinMeters(left: LatLng, right: LatLng, meters: number): boolean {
  const lat = (left.latitude - right.latitude) * 111_320;
  const lng =
    (left.longitude - right.longitude) * 111_320 * Math.cos((left.latitude * Math.PI) / 180);
  return lat * lat + lng * lng <= meters * meters;
}
