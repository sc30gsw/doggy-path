/**
 * Pure geometry: routed loop + surroundings → `Course`. PRIVATE to `convex/courseBuilder/`.
 * No I/O, so every share calculation is unit-testable with hand-made coordinates.
 */
import type { LatLng } from '../../domain/courseConditions';
import type { Course } from '../../domain/proposal';
import type { RoutedLoop } from './ors';
import type { BoundingBox, Surroundings } from './overpass';

/** Within this distance of a main-road polyline, a segment counts as "along a main road". */
export const MAIN_ROAD_PROXIMITY_M = 15;

export function boundingBoxOf(paths: readonly LatLng[][]): BoundingBox {
  void paths;
  // TODO: min/max over all points, padded by ~100 m.
  throw new Error('not implemented');
}

export function toCourse(loop: RoutedLoop, surroundings: Surroundings | null): Course {
  void loop;
  void surroundings;
  // TODO: greenShare = Σ length of segments whose midpoint is inside any green ring / distance;
  //       mainRoadShare = Σ length of segments within MAIN_ROAD_PROXIMITY_M of a main road / distance;
  //       path = simplifyPath(loop.path, MAX_PATH_POINTS) (Douglas–Peucker, keep endpoints).
  throw new Error('not implemented');
}
