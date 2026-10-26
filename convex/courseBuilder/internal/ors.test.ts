import { describe, expect, test } from 'bun:test';

import { pathLengthM } from './geo';
import { toFailedRoundTrip, toRoundTripResult } from './ors';

const noRouteCodes = [2004, 2009, 2010, 2099];

function loopBody({
  coordinates,
  distance,
  ascent,
  summaryAscent,
  surface,
}: {
  coordinates: [number, number, number?][];
  distance: number;
  ascent?: number;
  summaryAscent?: number;
  surface: [number, number, number][];
}) {
  return {
    features: [
      {
        geometry: { coordinates },
        properties: {
          ...(ascent === undefined ? {} : { ascent }),
          summary: {
            distance,
            ...(summaryAscent === undefined ? {} : { ascent: summaryAscent }),
          },
          extras: { surface: { values: surface } },
        },
      },
      {
        geometry: { coordinates: [[1, 1]] },
        properties: {
          ascent: 999,
          summary: { distance: 999 },
          extras: { surface: { values: [] } },
        },
      },
    ],
  };
}

describe('toRoundTripResult', () => {
  test('a loop keeps the first feature, the summary distance, and the seed key', () => {
    const coordinates: [number, number, number?][] = [
      [139, 35, 10],
      [139, 36, 20],
    ];
    const result = toRoundTripResult({
      seed: 7,
      body: loopBody({
        coordinates,
        distance: 1_234,
        ascent: 40,
        summaryAscent: 99,
        surface: [[0, 1, 1]],
      }),
    });

    expect(result).toEqual({
      kind: 'loop',
      loop: {
        key: 'seed-7',
        path: [
          { latitude: 35, longitude: 139 },
          { latitude: 36, longitude: 139 },
        ],
        distanceM: 1_234,
        ascentM: 40,
        unpavedShare: 0,
      },
    });
  });

  test('summary ascent fills in when the feature ascent is missing', () => {
    const result = toRoundTripResult({
      seed: 1,
      body: loopBody({
        coordinates: [
          [0, 0],
          [0, 1],
        ],
        distance: 10,
        summaryAscent: 15,
        surface: [],
      }),
    });
    expect(result.kind).toBe('loop');
    if (result.kind !== 'loop') return;
    expect(result.loop.ascentM).toBe(15);
  });

  test('unpaved share is the unpaved slice of the traced path, and a point path is zero', () => {
    const coordinates: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const path = coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    const result = toRoundTripResult({
      seed: 3,
      body: loopBody({
        coordinates,
        distance: 50,
        ascent: 1,
        surface: [[0, 1, 2]],
      }),
    });
    expect(result.kind).toBe('loop');
    if (result.kind !== 'loop') return;
    expect(result.loop.unpavedShare).toBeCloseTo(
      pathLengthM({ path, fromIndex: 0, toIndex: 1 }) / pathLengthM({ path }),
      6,
    );

    const point = toRoundTripResult({
      seed: 4,
      body: loopBody({
        coordinates: [
          [0, 0],
          [0, 0],
        ],
        distance: 0,
        ascent: 0,
        surface: [[0, 1, 2]],
      }),
    });
    expect(point.kind).toBe('loop');
    if (point.kind !== 'loop') return;
    expect(point.loop.unpavedShare).toBe(0);
  });

  test('a body without a route geometry or an ascent is unavailable', () => {
    expect(toRoundTripResult({ seed: 1, body: {} })).toEqual({ kind: 'unavailable' });
    expect(
      toRoundTripResult({
        seed: 1,
        body: loopBody({
          coordinates: [
            [0, 0],
            [0, 1],
          ],
          distance: 10,
          surface: [],
        }),
      }),
    ).toEqual({ kind: 'unavailable' });
  });
});

describe('toFailedRoundTrip', () => {
  test('the documented no-route codes are noRoute, and anything else is unavailable', () => {
    for (const code of noRouteCodes) {
      expect(toFailedRoundTrip({ error: { code } })).toEqual({ kind: 'noRoute' });
    }
    expect(toFailedRoundTrip({ error: { code: 2000 } })).toEqual({ kind: 'unavailable' });
    expect(toFailedRoundTrip({})).toEqual({ kind: 'unavailable' });
    expect(toFailedRoundTrip({ error: { code: '2099' } })).toEqual({ kind: 'unavailable' });
  });
});
