import { v, type Infer } from 'convex/values';

import { BREED_CHOICE_LABELS, JKC_BREEDS, isJkcBreedId, breedValidator } from './breeds';

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

const breedLabels = {
  jkc: (breed: Extract<Breed, { kind: 'jkc' }>) =>
    JKC_BREEDS.find((entry) => entry.id === breed.id)?.ja ?? breed.id,
  mixed: () => BREED_CHOICE_LABELS.mixed,
  other: (breed: Extract<Breed, { kind: 'other' }>) => breed.text,
} as const;

export function breedLabel(breed: Breed): string {
  if (breed.kind === 'jkc') return breedLabels.jkc(breed);
  if (breed.kind === 'other') return breedLabels.other(breed);
  return breedLabels.mixed();
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

function trimmedNames(owner: Owner): string[] {
  return [owner.ownerName, owner.dog.dogName].map((name) => name.trim());
}

function nameProblems(owner: Owner): OwnerProblem[] {
  const names = trimmedNames(owner);
  const problems: OwnerProblem[] = [];
  if (names.some((name) => name.length === 0)) problems.push('blankName');
  if (names.some((name) => name.length > DOG_PROFILE_LIMITS.nameMaxLength)) {
    problems.push('nameTooLong');
  }
  return problems;
}

function jkcBreedProblems(id: string): OwnerProblem[] {
  return isJkcBreedId(id) ? [] : ['unknownBreed'];
}

function otherBreedProblems(text: string): OwnerProblem[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return ['blankOtherBreed'];
  if (trimmed.length > DOG_PROFILE_LIMITS.otherBreedMaxLength) return ['nameTooLong'];
  return [];
}

function breedProblems(owner: Owner): OwnerProblem[] {
  const breed = owner.dog.breed;
  if (breed.kind === 'jkc') return jkcBreedProblems(breed.id);
  if (breed.kind === 'other') return otherBreedProblems(breed.text);
  return [];
}

function birthMonthIsAfter({ birthMonth, now }: { birthMonth: BirthMonth; now: Date }): boolean {
  if (birthMonth.year > now.getFullYear()) return true;
  return birthMonth.year === now.getFullYear() && birthMonth.month > now.getMonth() + 1;
}

function birthMonthProblems({ owner, now }: { owner: Owner; now: Date }): OwnerProblem[] {
  const birthMonth = owner.dog.birthMonth;
  if (birthMonth.year < DOG_PROFILE_LIMITS.earliestBirthYear) return ['birthMonthOutOfRange'];
  if (birthMonthIsAfter({ birthMonth, now })) return ['birthMonthOutOfRange'];
  return [];
}

function weightInRange(weight: number): boolean {
  return (
    Number.isFinite(weight) &&
    weight >= DOG_PROFILE_LIMITS.weightKg.min &&
    weight <= DOG_PROFILE_LIMITS.weightKg.max
  );
}

function weightProblems(owner: Owner): OwnerProblem[] {
  const weight = owner.dog.weightKg;
  if (weight === undefined) return [];
  return weightInRange(weight) ? [] : ['weightOutOfRange'];
}

function memoProblems(owner: Owner): OwnerProblem[] {
  const memo = owner.dog.dogMemo;
  if (memo !== undefined && memo.trim().length > DOG_PROFILE_LIMITS.memoMaxLength)
    return ['memoTooLong'];
  return [];
}

export function findOwnerProblems({ owner, now }: { owner: Owner; now: Date }): OwnerProblem[] {
  return [
    ...nameProblems(owner),
    ...breedProblems(owner),
    ...birthMonthProblems({ owner, now }),
    ...weightProblems(owner),
    ...memoProblems(owner),
  ];
}
