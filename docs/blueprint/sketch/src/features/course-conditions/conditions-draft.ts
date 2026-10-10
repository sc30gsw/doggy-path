import * as vb from 'valibot';

import {
  CONDITION_LIMITS,
  MOOD_IDS,
  type CourseConditions,
  type LatLng,
  type Mood,
} from '@/convex/domain/courseConditions';
import { parseForm, type FormResult } from '@/lib/parse-form';

export type ConditionsDraft = {
  mood: Mood | null;
  todayMemo: string;
  targetDistanceKm: string;
  targetTimeMin: string;
  chosenStartPoint: LatLng | null;
};

export const EMPTY_CONDITIONS_DRAFT: ConditionsDraft = {
  mood: null,
  todayMemo: '',
  targetDistanceKm: '',
  targetTimeMin: '',
  chosenStartPoint: null,
};

export function draftFromConditions(conditions: CourseConditions): ConditionsDraft {
  return {
    mood: conditions.mood ?? null,
    todayMemo: conditions.todayMemo ?? '',
    targetDistanceKm:
      conditions.targetDistanceM === undefined ? '' : String(conditions.targetDistanceM / 1000),
    targetTimeMin: conditions.targetTimeMin === undefined ? '' : String(conditions.targetTimeMin),
    chosenStartPoint: conditions.chosenStartPoint ?? null,
  };
}

function optionalNumberField({
  limits,
  unitsPerInput,
  message,
}: {
  limits: { min: number; max: number };
  unitsPerInput: number;
  message: string;
}) {
  return vb.pipe(
    vb.string(),
    vb.trim(),
    vb.transform((text) => (text === '' ? undefined : Number(text) * unitsPerInput)),
    vb.check(
      (value) =>
        value === undefined || (Number.isFinite(value) && value >= limits.min && value <= limits.max),
      message,
    ),
  );
}

const latLngSchema = vb.object({ latitude: vb.number(), longitude: vb.number() });

const conditionsDraftSchema = vb.pipe(
  vb.object({
    mood: vb.nullable(vb.picklist(MOOD_IDS)),
    todayMemo: vb.pipe(vb.string(), vb.trim(), vb.maxLength(CONDITION_LIMITS.todayMemoMaxLength)),
    targetDistanceKm: optionalNumberField({
      limits: CONDITION_LIMITS.targetDistanceM,
      unitsPerInput: 1000,
      message: `距離は${CONDITION_LIMITS.targetDistanceM.min / 1000}〜${CONDITION_LIMITS.targetDistanceM.max / 1000}kmで入力してください`,
    }),
    targetTimeMin: optionalNumberField({
      limits: CONDITION_LIMITS.targetTimeMin,
      unitsPerInput: 1,
      message: `時間は${CONDITION_LIMITS.targetTimeMin.min}〜${CONDITION_LIMITS.targetTimeMin.max}分で入力してください`,
    }),
    chosenStartPoint: vb.nullable(latLngSchema),
  }),
  vb.transform(
    (draft): CourseConditions => ({
      mood: draft.mood ?? undefined,
      todayMemo: draft.todayMemo === '' ? undefined : draft.todayMemo,
      targetDistanceM: draft.targetDistanceKm,
      targetTimeMin: draft.targetTimeMin,
      chosenStartPoint: draft.chosenStartPoint ?? undefined,
    }),
  ),
);

export function parseConditionsDraft(
  draft: ConditionsDraft,
): FormResult<CourseConditions, keyof ConditionsDraft> {
  return parseForm({ schema: conditionsDraftSchema, draft });
}
