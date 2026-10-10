import * as vb from 'valibot';

import { env } from '../../_generated/server';
import type { LatLng } from '../../domain/courseConditions';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';

/** ORS round trips come back longer than the requested length; request this fraction of it. */
export const ROUND_TRIP_OVERSHOOT_COMPENSATION = 0.85;

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

export async function requestRoundTrip({
  start,
  requestedLengthM,
  seed,
}: {
  start: LatLng;
  requestedLengthM: number;
  seed: number;
}): Promise<RoundTripResult> {
  void start;
  void requestedLengthM;
  void seed;
  void env.ORS_API_KEY;
  void CALL_TIMEOUT_MS.ors;
  void unverifiedOrsResponseSchema;
  throw new Error('not implemented');
}

const unverifiedOrsResponseSchema = vb.object({
  features: vb.array(
    vb.object({
      geometry: vb.object({ coordinates: vb.array(vb.array(vb.number())) }),
      properties: vb.object({
        summary: vb.object({ distance: vb.number(), duration: vb.number() }),
        ascent: vb.optional(vb.number()),
        extras: vb.optional(vb.record(vb.string(), vb.unknown())),
      }),
    }),
  ),
});
