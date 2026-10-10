import type { LatLng } from '../../domain/courseConditions';

const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function distanceBetweenM({ from, to }: { from: LatLng; to: LatLng }): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function pathLengthM({
  path,
  fromIndex = 0,
  toIndex = path.length - 1,
}: {
  path: readonly LatLng[];
  fromIndex?: number;
  toIndex?: number;
}): number {
  let total = 0;
  for (let index = fromIndex; index < toIndex; index += 1) {
    total += distanceBetweenM({ from: path[index], to: path[index + 1] });
  }
  return total;
}
