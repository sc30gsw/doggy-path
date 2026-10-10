import { v, type Infer } from 'convex/values';

export const MOOD_IDS = ['relaxed', 'energetic', 'adventurous', 'tired', 'refresh'] as const;
export type Mood = (typeof MOOD_IDS)[number];

export const moodValidator = v.union(...MOOD_IDS.map((id) => v.literal(id)));

export const latLngValidator = v.object({ latitude: v.number(), longitude: v.number() });
export type LatLng = Infer<typeof latLngValidator>;

export const DEFAULT_POINT: LatLng = { latitude: 35.681236, longitude: 139.767125 };
export const DEFAULT_POINT_NAME = '東京駅';

export const courseConditionsValidator = v.object({
  mood: v.optional(moodValidator),
  todayMemo: v.optional(v.string()),
  targetDistanceM: v.optional(v.number()),
  targetTimeMin: v.optional(v.number()),
  chosenStartPoint: v.optional(latLngValidator),
});
export type CourseConditions = Infer<typeof courseConditionsValidator>;

export const CONDITION_LIMITS = {
  targetDistanceM: { min: 200, max: 20_000 },
  targetTimeMin: { min: 5, max: 240 },
  todayMemoMaxLength: 300,
} as const;

export type ConditionProblem = 'distanceOutOfRange' | 'timeOutOfRange' | 'memoTooLong';

export function findConditionProblems(conditions: CourseConditions): ConditionProblem[] {
  void conditions;
  throw new Error('not implemented');
}

export const startPointSourceValidator = v.union(
  v.literal('chosen'),
  v.literal('device'),
  v.literal('previous'),
  v.literal('default'),
);

export const resolvedStartPointValidator = v.object({
  point: latLngValidator,
  source: startPointSourceValidator,
});
export type ResolvedStartPoint = Infer<typeof resolvedStartPointValidator>;

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
