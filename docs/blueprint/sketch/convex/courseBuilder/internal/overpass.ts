/**
 * Overpass API: one query per proposal for parks/green areas and main roads around the
 * Start Point. PRIVATE to `convex/courseBuilder/`. Returns plain geometry, no OSM tags.
 */
import * as vb from 'valibot';

import type { LatLng } from '../../domain/courseConditions';

export type BoundingBox = { south: number; west: number; north: number; east: number };

export type Surroundings = {
  /** Outer rings of parks, gardens, green areas. */
  greenAreas: LatLng[][];
  /** Polylines of main roads (primary/secondary/trunk). */
  mainRoads: LatLng[][];
};

/** Resolves null on any failure: surroundings are nice-to-have, never fatal. */
export async function fetchSurroundings(box: BoundingBox): Promise<Surroundings | null> {
  void box;
  void overpassResponseSchema;
  // TODO: POST https://overpass-api.de/api/interpreter with [out:json][timeout:20];
  //       (way[leisure~"^(park|garden)$"](bbox); way[landuse~"^(grass|forest|recreation_ground)$"](bbox);
  //        way[highway~"^(trunk|primary|secondary)$"](bbox);); out geom;
  //       User-Agent identifying the app (fair-use); AbortSignal.timeout(25_000).
  throw new Error('not implemented');
}

/** Private. */
const overpassResponseSchema = vb.object({
  elements: vb.array(
    vb.object({
      type: vb.string(),
      tags: vb.optional(vb.record(vb.string(), vb.string())),
      geometry: vb.optional(vb.array(vb.object({ lat: vb.number(), lon: vb.number() }))),
    }),
  ),
});
