import * as vb from 'valibot';

import { env } from '../../_generated/server';
import type { LatLng } from '../../domain/courseConditions';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';
import { pathLengthM } from './geo';

const ROUND_TRIP_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';
const ROUND_TRIP_POINTS = 4;

export const ROUND_TRIP_OVERSHOOT_COMPENSATION = 0.85;

const NO_ROUTE_ERROR_CODES: ReadonlySet<number> = new Set([2004, 2009, 2010, 2099]);

const UNPAVED_SURFACE_IDS: ReadonlySet<number> = new Set([2, 8, 9, 10, 11, 12, 15, 16, 17]);

export type RoutedLoop = {
  key: string;
  path: LatLng[];
  distanceM: number;
  ascentM: number;
  unpavedShare: number;
};

export type RoundTripResult =
  | { kind: 'loop'; loop: RoutedLoop }
  | { kind: 'noRoute' }
  | { kind: 'unavailable' };

const extraValuesSchema = vb.object({
  values: vb.array(vb.tuple([vb.number(), vb.number(), vb.number()])),
});

const roundTripResponseSchema = vb.object({
  features: vb.pipe(
    vb.array(
      vb.object({
        geometry: vb.object({
          coordinates: vb.array(vb.tuple([vb.number(), vb.number(), vb.optional(vb.number())])),
        }),
        properties: vb.object({
          ascent: vb.optional(vb.number()),
          summary: vb.object({ distance: vb.number(), ascent: vb.optional(vb.number()) }),
          extras: vb.object({ surface: extraValuesSchema }),
        }),
      }),
    ),
    vb.minLength(1),
  ),
});

const errorResponseSchema = vb.object({
  error: vb.object({ code: vb.number() }),
});

export function roundTripRequestBody({
  start,
  requestedLengthM,
  seed,
}: {
  start: LatLng;
  requestedLengthM: number;
  seed: number;
}) {
  return {
    coordinates: [[start.longitude, start.latitude]],
    elevation: true,
    instructions: false,
    extra_info: ['surface'],
    options: {
      round_trip: { length: Math.round(requestedLengthM), points: ROUND_TRIP_POINTS, seed },
    },
  };
}

export function toRoundTripResult({
  seed,
  body,
}: {
  seed: number;
  body: unknown;
}): RoundTripResult {
  const parsed = vb.safeParse(roundTripResponseSchema, body);
  if (!parsed.success) return { kind: 'unavailable' };
  const [feature] = parsed.output.features;
  const ascentM = feature.properties.ascent ?? feature.properties.summary.ascent;
  if (ascentM === undefined) return { kind: 'unavailable' };

  const path = feature.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
  const routedM = pathLengthM({ path });
  const unpavedM = feature.properties.extras.surface.values
    .filter(([, , surfaceId]) => UNPAVED_SURFACE_IDS.has(surfaceId))
    .reduce((sum, [fromIndex, toIndex]) => sum + pathLengthM({ path, fromIndex, toIndex }), 0);

  return {
    kind: 'loop',
    loop: {
      key: `seed-${seed}`,
      path,
      distanceM: feature.properties.summary.distance,
      ascentM,
      unpavedShare: routedM === 0 ? 0 : Math.min(1, unpavedM / routedM),
    },
  };
}

export function toFailedRoundTrip(body: unknown): RoundTripResult {
  const parsed = vb.safeParse(errorResponseSchema, body);
  return parsed.success && NO_ROUTE_ERROR_CODES.has(parsed.output.error.code)
    ? { kind: 'noRoute' }
    : { kind: 'unavailable' };
}

export async function requestRoundTrip({
  start,
  requestedLengthM,
  seed,
}: {
  start: LatLng;
  requestedLengthM: number;
  seed: number;
}): Promise<RoundTripResult> {
  try {
    const response = await fetch(ROUND_TRIP_URL, {
      method: 'POST',
      headers: { Authorization: env.ORS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(roundTripRequestBody({ start, requestedLengthM, seed })),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS.ors),
    });
    const body: unknown = await response.json().catch(() => null);
    return response.ok ? toRoundTripResult({ seed, body }) : toFailedRoundTrip(body);
  } catch {
    return { kind: 'unavailable' };
  }
}
