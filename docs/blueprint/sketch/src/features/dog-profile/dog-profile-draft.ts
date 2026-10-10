/**
 * The onboarding / Profile form's draft and its one parser. Output type is `Owner`
 * (the Owner's name + their Dog Profile), the Convex-derived type (ADR 0002): if the
 * Valibot schema and the Convex validator drift, `parseDogProfileDraft` stops compiling.
 */
import * as vb from 'valibot';

import type { Breed, Owner, Sex } from '@/convex/domain/dogProfile';
import { DOG_PROFILE_LIMITS } from '@/convex/domain/dogProfile';
import { parseForm, type FormResult } from '@/lib/parse-form';

/** What the inputs hold while editing. Strings for text inputs; null = not chosen yet. */
export type DogProfileDraft = {
  ownerName: string;
  dogName: string;
  breed: Breed | null;
  birthYear: number;
  birthMonth: number;
  birthMonthEstimated: boolean;
  sex: Sex | null;
  weightKg: string;
  dogMemo: string;
};

export function emptyDogProfileDraft(now: Date): DogProfileDraft {
  void now;
  // TODO: names '', breed null, birth year/month = now's, estimated false, sex null, weight '', memo ''.
  throw new Error('not implemented');
}

/** Profile tab: start editing from the saved Owner. */
export function draftFromOwner(owner: Owner): DogProfileDraft {
  void owner;
  throw new Error('not implemented');
}

/** Private. Reads DOG_PROFILE_LIMITS; the server's findOwnerProblems reads the same table. */
const dogProfileDraftSchema = vb.object({
  ownerName: vb.pipe(vb.string(), vb.trim(), vb.nonEmpty('飼い主の名前を入力してください')),
  dogName: vb.pipe(vb.string(), vb.trim(), vb.nonEmpty('わんちゃんの名前を入力してください')),
  weightKg: vb.pipe(
    vb.string(),
    vb.trim(),
    // TODO: '' → undefined; else number within DOG_PROFILE_LIMITS.weightKg
  ),
  // TODO: breed (non-null; other → non-empty text), birth year/month (not future,
  //       ≥ earliestBirthYear), sex (non-null), dogMemo ('' → undefined, ≤ memoMaxLength),
  //       then vb.transform to the Owner shape ({ ownerName, dog: { ... } }).
});

export function parseDogProfileDraft(
  draft: DogProfileDraft,
): FormResult<Owner, keyof DogProfileDraft> {
  void dogProfileDraftSchema;
  void DOG_PROFILE_LIMITS;
  void draft;
  void parseForm;
  // TODO: return parseForm(dogProfileDraftSchema, draft) once the schema ends in a
  //       vb.transform producing Owner — the declared return type enforces the match.
  throw new Error('not implemented');
}
