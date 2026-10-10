import * as vb from 'valibot';

import { env } from '../../_generated/server';
import type { LatLng } from '../../domain/courseConditions';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';

const PUBLIC_OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const GREEN_LEISURE = new Set(['park', 'garden']);
const GREEN_LANDUSE = new Set(['grass', 'forest', 'recreation_ground']);
const MAIN_HIGHWAYS = new Set(['trunk', 'primary', 'secondary']);

export type BoundingBox = { south: number; west: number; north: number; east: number };

export type Surroundings = {
  greenAreas: LatLng[][];
  mainRoads: LatLng[][];
};

export async function fetchSurroundings(box: BoundingBox): Promise<Surroundings | null> {
  try {
    const response = await fetch(env.OVERPASS_API_URL ?? PUBLIC_OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'User-Agent': 'doggy-path/1.0 (course surroundings)' },
      body: overpassQuery(box),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS.overpass),
    });
    if (!response.ok) return null;
    const parsed = vb.safeParse(overpassResponseSchema, await response.json());
    if (!parsed.success) return null;
    return splitElements(parsed.output.elements);
  } catch {
    return null;
  }
}

function overpassQuery(box: BoundingBox): string {
  const bbox = `${box.south},${box.west},${box.north},${box.east}`;
  return `[out:json][timeout:20];(way[leisure~"^(park|garden)$"](${bbox});way[landuse~"^(grass|forest|recreation_ground)$"](${bbox});way[highway~"^(trunk|primary|secondary)$"](${bbox}););out geom;`;
}

function splitElements(
  elements: readonly {
    tags?: Record<string, string>;
    geometry?: readonly { lat: number; lon: number }[];
  }[],
): Surroundings {
  const greenAreas: LatLng[][] = [];
  const mainRoads: LatLng[][] = [];
  for (const element of elements) {
    const path = toPath(element.geometry);
    if (!path) continue;
    if (isGreen(element.tags)) greenAreas.push(path);
    if (isMainRoad(element.tags)) mainRoads.push(path);
  }
  return { greenAreas, mainRoads };
}

function toPath(
  geometry: readonly { lat: number; lon: number }[] | undefined,
): LatLng[] | undefined {
  if (!geometry || geometry.length === 0) return;
  return geometry.map((point) => ({ latitude: point.lat, longitude: point.lon }));
}

function isGreen(tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  return GREEN_LEISURE.has(tags.leisure ?? '') || GREEN_LANDUSE.has(tags.landuse ?? '');
}

function isMainRoad(tags: Record<string, string> | undefined): boolean {
  return MAIN_HIGHWAYS.has(tags?.highway ?? '');
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
