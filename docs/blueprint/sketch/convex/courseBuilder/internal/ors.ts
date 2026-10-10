/**
 * OpenRouteService `POST /v2/directions/foot-walking/geojson` with `options.round_trip`.
 * PRIVATE to `convex/courseBuilder/`. The only file that knows ORS URLs, keys, params
 * or response shapes; it returns `RoutedLoop`, which carries no ORS vocabulary.
 */
import * as vb from 'valibot';

import type { LatLng } from '../../domain/courseConditions';

/** ORS returns loops longer than requested; ask for this fraction of the target. */
export const REQUESTED_LENGTH_FACTOR = 0.85;

/** A loop as routed, before surroundings are known. Segment fractions come from `extra_info`. */
export type RoutedLoop = {
  /** Closed: first point equals last point. */
  path: LatLng[];
  distanceM: number;
  ascentM: number;
  /** Fraction of distance on unpaved surfaces (from `surface` / `waycategory`). */
  unpavedShare: number;
  /** Stable id for this loop within one proposal. */
  key: string;
};

/** Thrown for quota (429), 5xx, network, or missing key: the proposal shows "retry". */
export class RoutingUnavailable extends Error {}

/**
 * One round trip. Resolves to null when ORS answers but cannot make a loop here
 * (e.g. 404 "no route"); rejects with RoutingUnavailable when ORS itself is unavailable.
 */
export async function requestRoundTrip(input: {
  start: LatLng;
  requestedLengthM: number;
  seed: number;
}): Promise<RoutedLoop | null> {
  void input;
  void orsResponseSchema;
  // TODO: body = { coordinates: [[lng, lat]], elevation: true,
  //                extra_info: ['surface', 'waycategory', 'steepness'],
  //                options: { round_trip: { length, points: 4, seed } } };
  //       header Authorization = process.env.ORS_API_KEY;
  //       vb.safeParse(orsResponseSchema, json); map [lng, lat, ele] → LatLng;
  //       unpavedShare = Σ distance of segments whose surface/waycategory is unpaved / total.
  throw new Error('not implemented');
}

/** Private. TODO: fill in from a real response (GeoJSON FeatureCollection). */
const orsResponseSchema = vb.object({
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
