import type { LatLng } from '../../domain/courseConditions';
import { MAX_PATH_POINTS, type Course } from '../../domain/proposal';
import { distanceBetweenM, pathLengthM } from './geo';
import type { RoutedLoop } from './ors';
import type { BoundingBox, Surroundings } from './overpass';

export const MAIN_ROAD_PROXIMITY_M = 15;
const BOX_PAD_M = 100;

export function boundingBoxOf(paths: readonly LatLng[][]): BoundingBox {
  const points = paths.flat();
  const first = points[0];
  if (!first) return { south: 0, west: 0, north: 0, east: 0 };
  let south = first.latitude;
  let north = first.latitude;
  let west = first.longitude;
  let east = first.longitude;
  for (const point of points) {
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
  }
  const latPad = BOX_PAD_M / 111_320;
  const lngPad = BOX_PAD_M / (111_320 * Math.cos(((south + north) / 2) * (Math.PI / 180)) || 1);
  return { south: south - latPad, north: north + latPad, west: west - lngPad, east: east + lngPad };
}

export function toCourse({
  loop,
  surroundings,
}: {
  loop: RoutedLoop;
  surroundings: Surroundings | null;
}): Course {
  return {
    key: loop.key,
    path: simplifyPath(loop.path, MAX_PATH_POINTS),
    distanceM: loop.distanceM,
    ascentM: loop.ascentM,
    unpavedShare: loop.unpavedShare,
    surroundings: shareOf(loop.path, surroundings),
  };
}

function shareOf(
  path: readonly LatLng[],
  surroundings: Surroundings | null,
): Course['surroundings'] {
  if (!surroundings) return { kind: 'unknown' };
  const total = pathLengthM({ path });
  if (total === 0) return { kind: 'known', greenShare: 0, mainRoadShare: 0 };
  return {
    kind: 'known',
    greenShare: coveredLength(path, (mid) => insideAny(mid, surroundings.greenAreas)) / total,
    mainRoadShare:
      coveredLength(path, (mid) => nearAny(mid, surroundings.mainRoads, MAIN_ROAD_PROXIMITY_M)) /
      total,
  };
}

function coveredLength(path: readonly LatLng[], hit: (midpoint: LatLng) => boolean): number {
  let covered = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    if (!from || !to || !hit(midpoint(from, to))) continue;
    covered += distanceBetweenM({ from, to });
  }
  return covered;
}

function midpoint(from: LatLng, to: LatLng): LatLng {
  return {
    latitude: (from.latitude + to.latitude) / 2,
    longitude: (from.longitude + to.longitude) / 2,
  };
}

function insideAny(point: LatLng, rings: readonly LatLng[][]): boolean {
  return rings.some((ring) => pointInRing(point, ring));
}

function nearAny(point: LatLng, lines: readonly LatLng[][], meters: number): boolean {
  return lines.some((line) => distanceToLineM(point, line) <= meters);
}

function pointInRing(point: LatLng, ring: readonly LatLng[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const start = ring[previous];
    const end = ring[index];
    if (!start || !end) continue;
    const crosses = start.latitude > point.latitude !== end.latitude > point.latitude;
    if (!crosses) continue;
    const lng =
      ((end.longitude - start.longitude) * (point.latitude - start.latitude)) /
        (end.latitude - start.latitude) +
      start.longitude;
    if (point.longitude < lng) inside = !inside;
  }
  return inside;
}

function distanceToLineM(point: LatLng, line: readonly LatLng[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < line.length - 1; index += 1) {
    const from = line[index];
    const to = line[index + 1];
    if (!from || !to) continue;
    best = Math.min(best, distanceBetweenM({ from: point, to: closestOnSegment(point, from, to) }));
  }
  return best;
}

function closestOnSegment(point: LatLng, from: LatLng, to: LatLng): LatLng {
  const dx = to.longitude - from.longitude;
  const dy = to.latitude - from.latitude;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return from;
  const t = Math.min(
    1,
    Math.max(
      0,
      ((point.longitude - from.longitude) * dx + (point.latitude - from.latitude) * dy) / length2,
    ),
  );
  return { latitude: from.latitude + t * dy, longitude: from.longitude + t * dx };
}

function simplifyPath(path: LatLng[], maxPoints: number): LatLng[] {
  if (path.length <= maxPoints) return path;
  let epsilon = 1;
  let simplified = douglasPeucker(path, epsilon);
  while (simplified.length > maxPoints && epsilon < 10_000) {
    epsilon *= 1.5;
    simplified = douglasPeucker(path, epsilon);
  }
  return simplified;
}

function douglasPeucker(path: LatLng[], epsilonM: number): LatLng[] {
  const first = path[0];
  const last = path[path.length - 1];
  if (!first || !last || path.length < 3) return [...path];
  let farthest = 0;
  let farthestIndex = 0;
  for (let index = 1; index < path.length - 1; index += 1) {
    const point = path[index];
    if (!point) continue;
    const distance = distanceBetweenM({ from: point, to: closestOnSegment(point, first, last) });
    if (distance > farthest) {
      farthest = distance;
      farthestIndex = index;
    }
  }
  if (farthest <= epsilonM) return [first, last];
  const left = douglasPeucker(path.slice(0, farthestIndex + 1), epsilonM);
  const right = douglasPeucker(path.slice(farthestIndex), epsilonM);
  return [...left.slice(0, -1), ...right];
}
