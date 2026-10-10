import * as vb from 'valibot';

import { env } from '../../_generated/server';
import type { LatLng } from '../../domain/courseConditions';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';

const PUBLIC_OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export type BoundingBox = { south: number; west: number; north: number; east: number };

export type Surroundings = {
  greenAreas: LatLng[][];
  mainRoads: LatLng[][];
};

/** null on any failure: surroundings enrich a course and never fail a proposal. */
export async function fetchSurroundings(box: BoundingBox): Promise<Surroundings | null> {
  void box;
  void (env.OVERPASS_API_URL ?? PUBLIC_OVERPASS_API_URL);
  void CALL_TIMEOUT_MS.overpass;
  void overpassResponseSchema;
  throw new Error('not implemented');
}

const overpassResponseSchema = vb.object({
  elements: vb.array(
    vb.object({
      type: vb.string(),
      tags: vb.optional(vb.record(vb.string(), vb.string())),
      geometry: vb.optional(vb.array(vb.object({ lat: vb.number(), lon: vb.number() }))),
    }),
  ),
});
