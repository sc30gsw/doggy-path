import { MOOD_LABELS, type CourseConditions } from '../../domain/courseConditions';
import { ageInMonths, breedLabel, type DogProfile } from '../../domain/dogProfile';
import type { Assessment, Course, Fit } from '../../domain/proposal';
import { CONDITION_CHECK_THRESHOLD } from '../../domain/tuning';
import type { LengthBasis, LengthClass, WalkingPace } from '../../domain/walk';
import {
  choice,
  noul,
  score,
  type ChoiceQuestion,
  type JevAnswers,
  type JsonObject,
  type NoulQuestion,
  type ScoreQuestion,
} from './jev';

export function dogState({ dog, now }: { dog: DogProfile; now: Date }): JsonObject {
  return {
    breed: breedLabel(dog.breed),
    ageMonths: ageInMonths({ birthMonth: dog.birthMonth, now }),
    ageIsEstimated: dog.birthMonth.estimated,
    sex: dog.sex,
    weightKg: dog.weightKg ?? null,
    dogMemo: dog.dogMemo ?? null,
  };
}

export function todayState(conditions: CourseConditions): JsonObject {
  return {
    ownerMood: conditions.mood === undefined ? null : MOOD_LABELS[conditions.mood],
    todayMemo: conditions.todayMemo ?? null,
    targetDistanceKm:
      conditions.targetDistanceM === undefined ? null : conditions.targetDistanceM / 1000,
    targetTimeMin: conditions.targetTimeMin ?? null,
  };
}

export type ConditionQuestions = {
  pace: ChoiceQuestion<WalkingPace>;
  lengthClass?: ChoiceQuestion<LengthClass>;
  targetsConsistent?: NoulQuestion;
  tooMuchLoad: NoulQuestion;
};

export function conditionQuestions({
  conditions,
  basis,
}: {
  conditions: CourseConditions;
  basis: LengthBasis;
}): ConditionQuestions {
  void conditions;
  void basis;
  void choice;
  void noul;
  throw new Error('not implemented');
}

export function interpretConditions({
  basis,
  answers,
}: {
  basis: LengthBasis;
  answers: JevAnswers<ConditionQuestions>;
}): Assessment {
  void basis;
  void answers;
  void CONDITION_CHECK_THRESHOLD;
  throw new Error('not implemented');
}

export function fallbackAssessment(basis: LengthBasis): Assessment {
  return {
    pace: 'normal',
    length: basis.basis === 'judged' ? { basis: 'judged', lengthClass: 'normal' } : basis,
    warnings: [],
    judgedBy: 'fallback',
  };
}

type BodyFitKey = `body:${string}`;
type MoodFitKey = `mood:${string}`;

export type FitQuestions = { readonly [key: BodyFitKey | MoodFitKey]: ScoreQuestion };

const bodyFitKey = (courseKey: string): BodyFitKey => `body:${courseKey}`;
const moodFitKey = (courseKey: string): MoodFitKey => `mood:${courseKey}`;

export function coursesState({
  courses,
  pace,
}: {
  courses: readonly Course[];
  pace: WalkingPace;
}): JsonObject {
  void courses;
  void pace;
  throw new Error('not implemented');
}

export function fitQuestions({
  courses,
  hasMood,
}: {
  courses: readonly Course[];
  hasMood: boolean;
}): FitQuestions {
  void courses;
  void hasMood;
  void score;
  void moodFitKey;
  throw new Error('not implemented');
}

export function interpretFit({
  answers,
  courseKey,
  hasMood,
}: {
  answers: JevAnswers<FitQuestions>;
  courseKey: string;
  hasMood: boolean;
}): Fit {
  return {
    body: answers[bodyFitKey(courseKey)].positionTowardBest,
    mood: hasMood ? answers[moodFitKey(courseKey)].positionTowardBest : null,
  };
}
