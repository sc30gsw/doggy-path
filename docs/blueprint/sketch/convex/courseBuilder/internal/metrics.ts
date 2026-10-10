import type { LatLng } from '../../domain/courseConditions';
import type { Course } from '../../domain/proposal';
import type { RoutedLoop } from './ors';
import type { BoundingBox, Surroundings } from './overpass';

export const MAIN_ROAD_PROXIMITY_M = 15;

export function boundingBoxOf(paths: readonly LatLng[][]): BoundingBox {
  void paths;
  throw new Error('not implemented');
}

export function toCourse({
  loop,
  surroundings,
}: {
  loop: RoutedLoop;
  surroundings: Surroundings | null;
}): Course {
  void loop;
  void surroundings;
  throw new Error('not implemented');
}
