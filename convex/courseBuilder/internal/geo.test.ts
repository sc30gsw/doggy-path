import { describe, expect, test } from 'bun:test';

import type { LatLng } from '../../domain/courseConditions';
import { pathLengthM } from './geo';

const meanRadiusM = 6_371_000;
const oneDegreeM = meanRadiusM * (Math.PI / 180);

function point(latitude: number, longitude: number): LatLng {
  return { latitude, longitude };
}

describe('pathLengthM', () => {
  test('a degree of latitude or of equatorial longitude is one great-circle degree', () => {
    expect(pathLengthM({ path: [point(35, 139), point(36, 139)] })).toBeCloseTo(oneDegreeM, 2);
    expect(pathLengthM({ path: [point(0, 0), point(0, 1)] })).toBeCloseTo(oneDegreeM, 2);
  });

  test('sums every segment, and a from/to range sums only that slice', () => {
    const path = [point(0, 0), point(1, 0), point(2, 0)];
    expect(pathLengthM({ path })).toBeCloseTo(oneDegreeM * 2, 2);
    expect(pathLengthM({ path, fromIndex: 1, toIndex: 2 })).toBeCloseTo(oneDegreeM, 2);
  });

  test('an empty range is zero', () => {
    expect(pathLengthM({ path: [] })).toBe(0);
    expect(pathLengthM({ path: [point(1, 1)] })).toBe(0);
    expect(pathLengthM({ path: [point(1, 1), point(1, 1)] })).toBe(0);
    expect(pathLengthM({ path: [point(0, 0), point(1, 0)], fromIndex: 1, toIndex: 0 })).toBe(0);
  });
});
