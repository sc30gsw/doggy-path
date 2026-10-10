/**
 * The Course Conditions sheet's draft and its one parser (spec step 1: reject plainly
 * invalid numbers). Output type is the Convex-derived `CourseConditions`.
 */
import * as vb from 'valibot';

import {
  CONDITION_LIMITS,
  type CourseConditions,
  type LatLng,
  type Mood,
} from '@/convex/domain/courseConditions';
import { parseForm, type FormResult } from '@/lib/parse-form';

export type ConditionsDraft = {
  mood: Mood | null;
  todayMemo: string;
  /** km as typed, e.g. "2.5"; converted to metres on parse. */
  targetDistanceKm: string;
  targetTimeMin: string;
  startPoint: LatLng | null;
};

export const EMPTY_CONDITIONS_DRAFT: ConditionsDraft = {
  mood: null,
  todayMemo: '',
  targetDistanceKm: '',
  targetTimeMin: '',
  startPoint: null,
};

/** 「条件を直す」: reopen the sheet exactly as the Owner left it. */
export function draftFromConditions(conditions: CourseConditions): ConditionsDraft {
  void conditions;
  // TODO: metres → km string (trim trailing zeros); undefined → '' / null.
  throw new Error('not implemented');
}

/** '' → undefined; otherwise a finite number in [min, max] after `scale`. */
function optionalNumberField(limits: { min: number; max: number }, scale: number, message: string) {
  return vb.pipe(
    vb.string(),
    vb.trim(),
    vb.transform((text) => (text === '' ? undefined : Number(text) * scale)),
    vb.check(
      (value) =>
        value === undefined || (Number.isFinite(value) && value >= limits.min && value <= limits.max),
      message,
    ),
  );
}

const conditionsDraftSchema = vb.pipe(
  vb.object({
    mood: vb.nullable(vb.custom<Mood>(() => true)),
    todayMemo: vb.pipe(vb.string(), vb.trim(), vb.maxLength(CONDITION_LIMITS.todayMemoMaxLength)),
    targetDistanceKm: optionalNumberField(
      CONDITION_LIMITS.targetDistanceM,
      1000,
      `距離は${CONDITION_LIMITS.targetDistanceM.min / 1000}〜${CONDITION_LIMITS.targetDistanceM.max / 1000}kmで入力してください`,
    ),
    targetTimeMin: optionalNumberField(
      CONDITION_LIMITS.targetTimeMin,
      1,
      `時間は${CONDITION_LIMITS.targetTimeMin.min}〜${CONDITION_LIMITS.targetTimeMin.max}分で入力してください`,
    ),
    startPoint: vb.nullable(vb.custom<LatLng>(() => true)),
  }),
  vb.transform(
    (draft): CourseConditions => ({
      mood: draft.mood ?? undefined,
      todayMemo: draft.todayMemo === '' ? undefined : draft.todayMemo,
      targetDistanceM: draft.targetDistanceKm,
      targetTimeMin: draft.targetTimeMin,
      startPoint: draft.startPoint ?? undefined,
    }),
  ),
);

export function parseConditionsDraft(
  draft: ConditionsDraft,
): FormResult<CourseConditions, keyof ConditionsDraft> {
  return parseForm(conditionsDraftSchema, draft);
}
