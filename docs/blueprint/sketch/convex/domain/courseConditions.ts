/**
 * Course Conditions: Mood catalog, the conditions shape, limits, and Start Point rules.
 *
 * Shared with the client. The Mood list lives here once; the client's icon table
 * (`MOOD_SYMBOLS` in `src/features/course-conditions/mood-chips.tsx`) is a `Record<Mood, …>`, so adding a
 * Mood here fails the client build until it gets an icon.
 */
import { v, type Infer } from 'convex/values';

/** The Owner's (human's) Mood. Order = chip order on screen. `ja` is shown and sent to Jev. */
export const MOODS = [
  { id: 'relaxed', ja: 'のんびり' },
  { id: 'energetic', ja: '元気いっぱい' },
  { id: 'adventurous', ja: '冒険したい' },
  { id: 'tired', ja: '疲れ気味' },
  { id: 'refresh', ja: '気分転換' },
] as const;

export type Mood = (typeof MOODS)[number]['id'];

export const moodValidator = v.union(...MOODS.map((mood) => v.literal(mood.id)));

export function moodLabel(mood: Mood): string {
  // `MOODS` is total over `Mood`, so the find always succeeds.
  return MOODS.find((entry) => entry.id === mood)?.ja ?? mood;
}

/** Field names match `react-native-maps`' `LatLng`, so the client renders without mapping. */
export const latLngValidator = v.object({ latitude: v.number(), longitude: v.number() });
export type LatLng = Infer<typeof latLngValidator>;

/** Tokyo Station. Used when nothing else gives a Start Point. */
export const DEFAULT_POINT: LatLng = { latitude: 35.681236, longitude: 139.767125 };
export const DEFAULT_POINT_NAME = '東京駅';

/**
 * What the Owner entered. Every part is optional (GLOSSARY: Course Conditions).
 * Units are in the field names; both targets may be present at once.
 * `startPoint` is what the Owner chose (current-location button or map pin), never a fallback.
 */
export const courseConditionsValidator = v.object({
  mood: v.optional(moodValidator),
  todayMemo: v.optional(v.string()),
  targetDistanceM: v.optional(v.number()),
  targetTimeMin: v.optional(v.number()),
  startPoint: v.optional(latLngValidator),
});
export type CourseConditions = Infer<typeof courseConditionsValidator>;

/**
 * "Plainly invalid" bounds. Read by the client's Valibot schema AND by
 * `findConditionProblems` on the server. Anything inside these bounds is the
 * Condition Check's business, not validation's.
 */
export const CONDITION_LIMITS = {
  targetDistanceM: { min: 200, max: 20_000 },
  targetTimeMin: { min: 5, max: 240 },
  todayMemoMaxLength: 300,
} as const;

export type ConditionProblem = 'distanceOutOfRange' | 'timeOutOfRange' | 'memoTooLong';

/** Server-side guard for `proposals.request`. Empty array = acceptable. */
export function findConditionProblems(conditions: CourseConditions): ConditionProblem[] {
  void conditions;
  // TODO: compare each present field with CONDITION_LIMITS; reject NaN/Infinity.
  throw new Error('not implemented');
}

/** Where the proposal's Start Point came from. Shown as a small note on the result screen. */
export const startPointSourceValidator = v.union(
  v.literal('chosen'), // Owner tapped current location or dropped a pin
  v.literal('device'), // left empty; the device's current location was available
  v.literal('previous'), // left empty, no device location; previous proposal's Start Point
  v.literal('default'), // nothing else: Default Point
);

export const resolvedStartPointValidator = v.object({
  point: latLngValidator,
  source: startPointSourceValidator,
});
export type ResolvedStartPoint = Infer<typeof resolvedStartPointValidator>;

/**
 * The Start Point fallback chain, as one total function.
 * The client contributes what only it knows (`deviceLocation`); the server contributes
 * what only it knows (`previous`, derived from the Owner's latest proposal, never stored separately).
 */
export function resolveStartPoint(input: {
  chosen: LatLng | undefined;
  deviceLocation: LatLng | undefined;
  previous: LatLng | undefined;
}): ResolvedStartPoint {
  if (input.chosen) return { point: input.chosen, source: 'chosen' };
  if (input.deviceLocation) return { point: input.deviceLocation, source: 'device' };
  if (input.previous) return { point: input.previous, source: 'previous' };
  return { point: DEFAULT_POINT, source: 'default' };
}
