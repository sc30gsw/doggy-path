import { describe, expect, test } from 'bun:test';

import { DEFAULT_POINT, resolveStartPoint, type LatLng } from './courseConditions';

const chosen: LatLng = { latitude: 35.0, longitude: 135.0 };
const device: LatLng = { latitude: 34.0, longitude: 134.0 };
const previous: LatLng = { latitude: 33.0, longitude: 133.0 };
const origin: LatLng = { latitude: 0, longitude: 0 };

describe('resolveStartPoint', () => {
  test('prefers a chosen point, then the device, then the previous point', () => {
    expect(resolveStartPoint({ chosen, deviceLocation: device, previous })).toEqual({
      point: chosen,
      source: 'chosen',
    });
    expect(resolveStartPoint({ chosen: undefined, deviceLocation: device, previous })).toEqual({
      point: device,
      source: 'device',
    });
    expect(resolveStartPoint({ chosen: undefined, deviceLocation: undefined, previous })).toEqual({
      point: previous,
      source: 'previous',
    });
  });

  test('a point at the origin is still a chosen point', () => {
    expect(
      resolveStartPoint({ chosen: origin, deviceLocation: device, previous: undefined }),
    ).toEqual({ point: origin, source: 'chosen' });
  });

  test('with nothing supplied, the start is the default point', () => {
    expect(
      resolveStartPoint({ chosen: undefined, deviceLocation: undefined, previous: undefined }),
    ).toEqual({ point: DEFAULT_POINT, source: 'default' });
  });
});
