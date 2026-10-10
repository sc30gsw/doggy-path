/**
 * Owner and Dog Profile: shapes, limits, and derived facts (age, breed label).
 *
 * Shared with the client. `ownerFields` is the single source of truth for what the
 * onboarding / Profile form saves (ADR 0002): the `owners` table, the `owners.save` args
 * and the client form's output type all come from it.
 *
 * The Owner's name belongs to the Owner, not to the Dog Profile (GLOSSARY), and it is
 * never sent to Jev: `dogState` reads only the Dog Profile.
 */
import { v, type Infer } from 'convex/values';

import { BREED_CHOICE_LABELS, JKC_BREEDS, breedValidator } from './breeds';

export const sexValidator = v.union(v.literal('male'), v.literal('female'));

/** Year + month (1–12). `estimated` marks an unknown exact date. Age is never stored. */
export const birthMonthValidator = v.object({
  year: v.number(),
  month: v.number(),
  estimated: v.boolean(),
});

export const dogProfileFields = {
  dogName: v.string(),
  breed: breedValidator,
  birthMonth: birthMonthValidator,
  sex: sexValidator,
  weightKg: v.optional(v.number()),
  dogMemo: v.optional(v.string()),
};

export const dogProfileValidator = v.object(dogProfileFields);

/**
 * One row per Owner, created by onboarding. The Dog Profile is embedded, so "exactly one
 * Dog Profile per Owner" holds by structure, and "onboarded" means "the row exists".
 */
export const ownerFields = {
  ownerName: v.string(),
  dog: dogProfileValidator,
};
export const ownerValidator = v.object(ownerFields);

export type Owner = Infer<typeof ownerValidator>;
export type DogProfile = Infer<typeof dogProfileValidator>;
export type Breed = DogProfile['breed'];
export type BirthMonth = DogProfile['birthMonth'];
export type Sex = DogProfile['sex'];

/**
 * Plausibility limits, read by BOTH the client's Valibot form schema and the server's
 * `findOwnerProblems`. One table, two readers; never inline these numbers.
 */
export const DOG_PROFILE_LIMITS = {
  nameMaxLength: 40,
  memoMaxLength: 500,
  otherBreedMaxLength: 40,
  weightKg: { min: 0.5, max: 100 },
  earliestBirthYear: 1995,
} as const;

/** Japanese label for any Breed. Used by the UI and by the Jev state. */
export function breedLabel(breed: Breed): string {
  switch (breed.kind) {
    case 'jkc':
      return JKC_BREEDS.find((entry) => entry.id === breed.id)?.ja ?? breed.id;
    case 'mixed':
      return BREED_CHOICE_LABELS.mixed;
    case 'other':
      return breed.text;
  }
}

/** Whole months between the Birth Month and `now`. The only way to get an age. */
export function ageInMonths(birthMonth: BirthMonth, now: Date): number {
  void birthMonth;
  void now;
  // TODO: (now.year - year) * 12 + (now.month(1-based) - month), clamped at 0.
  throw new Error('not implemented');
}

export type OwnerProblem =
  | 'blankName'
  | 'nameTooLong'
  | 'unknownBreed'
  | 'blankOtherBreed'
  | 'birthMonthOutOfRange'
  | 'weightOutOfRange'
  | 'memoTooLong';

/**
 * Server-side guard for the public `owners.save` mutation (a boundary: Convex validators
 * check types, not ranges or catalog membership). Empty array = acceptable.
 */
export function findOwnerProblems(owner: Owner, now: Date): OwnerProblem[] {
  void owner;
  void now;
  // TODO: trim-checks on ownerName / dog.dogName / other-breed text;
  //       jkc breed id → isJkcBreedId (./breeds); month in 1..12, year >= earliestBirthYear,
  //       birth month not after `now`; weight within limits; memo length.
  throw new Error('not implemented');
}
