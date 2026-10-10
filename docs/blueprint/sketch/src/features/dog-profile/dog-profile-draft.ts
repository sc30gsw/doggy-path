import * as vb from 'valibot';

import {
  DOG_PROFILE_LIMITS,
  MONTHS,
  SEXES,
  type Breed,
  type Month,
  type Owner,
  type Sex,
} from '@/convex/domain/dogProfile';
import { parseForm, type FormResult } from '@/lib/parse-form';

export type DogProfileDraft = {
  ownerName: string;
  dogName: string;
  breed: Breed | null;
  birthYear: number;
  birthMonth: Month;
  birthMonthEstimated: boolean;
  sex: Sex | null;
  weightKg: string;
  dogMemo: string;
};

export function emptyDogProfileDraft(now: Date): DogProfileDraft {
  void now;
  throw new Error('not implemented');
}

export function draftFromOwner(owner: Owner): DogProfileDraft {
  void owner;
  throw new Error('not implemented');
}

const nameSchema = (message: string) =>
  vb.pipe(vb.string(), vb.trim(), vb.nonEmpty(message), vb.maxLength(DOG_PROFILE_LIMITS.nameMaxLength));

const breedSchema = vb.variant('kind', [
  vb.object({ kind: vb.literal('jkc'), id: vb.string() }),
  vb.object({ kind: vb.literal('mixed') }),
  vb.object({
    kind: vb.literal('other'),
    text: vb.pipe(
      vb.string(),
      vb.trim(),
      vb.nonEmpty('犬種を入力してください'),
      vb.maxLength(DOG_PROFILE_LIMITS.otherBreedMaxLength),
    ),
  }),
]);

const weightKgSchema = vb.pipe(
  vb.string(),
  vb.trim(),
  vb.transform((text) => (text === '' ? undefined : Number(text))),
  vb.check(
    (kg) =>
      kg === undefined ||
      (Number.isFinite(kg) &&
        kg >= DOG_PROFILE_LIMITS.weightKg.min &&
        kg <= DOG_PROFILE_LIMITS.weightKg.max),
    `体重は${DOG_PROFILE_LIMITS.weightKg.min}〜${DOG_PROFILE_LIMITS.weightKg.max}kgで入力してください`,
  ),
);

const dogProfileDraftSchema = vb.pipe(
  vb.object({
    ownerName: nameSchema('飼い主の名前を入力してください'),
    dogName: nameSchema('わんちゃんの名前を入力してください'),
    breed: vb.nonNullable(vb.nullable(breedSchema), '犬種を選んでください'),
    birthYear: vb.pipe(vb.number(), vb.integer(), vb.minValue(DOG_PROFILE_LIMITS.earliestBirthYear)),
    birthMonth: vb.picklist(MONTHS),
    birthMonthEstimated: vb.boolean(),
    sex: vb.nonNullable(vb.nullable(vb.picklist(SEXES)), '性別を選んでください'),
    weightKg: weightKgSchema,
    dogMemo: vb.pipe(vb.string(), vb.trim(), vb.maxLength(DOG_PROFILE_LIMITS.memoMaxLength)),
  }),
  vb.transform(
    (draft): Owner => ({
      ownerName: draft.ownerName,
      dog: {
        dogName: draft.dogName,
        breed: draft.breed,
        birthMonth: {
          year: draft.birthYear,
          month: draft.birthMonth,
          estimated: draft.birthMonthEstimated,
        },
        sex: draft.sex,
        weightKg: draft.weightKg,
        dogMemo: draft.dogMemo === '' ? undefined : draft.dogMemo,
      },
    }),
  ),
);

export function parseDogProfileDraft(
  draft: DogProfileDraft,
): FormResult<Owner, keyof DogProfileDraft> {
  return parseForm({ schema: dogProfileDraftSchema, draft });
}
