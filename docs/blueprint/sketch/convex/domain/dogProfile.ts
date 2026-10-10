import { v, type Infer } from 'convex/values';

import { BREED_CHOICE_LABELS, JKC_BREEDS, breedValidator } from './breeds';

export const SEXES = ['male', 'female'] as const;
export const sexValidator = v.union(...SEXES.map((sex) => v.literal(sex)));

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type Month = (typeof MONTHS)[number];
export const monthValidator = v.union(...MONTHS.map((month) => v.literal(month)));

export const birthMonthValidator = v.object({
  year: v.number(),
  month: monthValidator,
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

export const DOG_PROFILE_LIMITS = {
  nameMaxLength: 40,
  memoMaxLength: 500,
  otherBreedMaxLength: 40,
  weightKg: { min: 0.5, max: 100 },
  earliestBirthYear: 1995,
} as const;

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

export function ageInMonths({ birthMonth, now }: { birthMonth: BirthMonth; now: Date }): number {
  const nowMonth = now.getMonth() + 1;
  const months = (now.getFullYear() - birthMonth.year) * 12 + (nowMonth - birthMonth.month);
  return Math.max(0, months);
}

export type OwnerProblem =
  | 'blankName'
  | 'nameTooLong'
  | 'unknownBreed'
  | 'blankOtherBreed'
  | 'birthMonthOutOfRange'
  | 'weightOutOfRange'
  | 'memoTooLong';

export function findOwnerProblems({ owner, now }: { owner: Owner; now: Date }): OwnerProblem[] {
  void owner;
  void now;
  throw new Error('not implemented');
}
