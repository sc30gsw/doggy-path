import { JKC_BREEDS } from '../../domain/breeds';
import type { CourseConditions, Mood } from '../../domain/courseConditions';
import { ageInMonths, type Breed, type DogProfile } from '../../domain/dogProfile';
import type { Assessment, ConditionWarning, Course, Fit } from '../../domain/proposal';
import { CONDITION_CHECK_THRESHOLD, LENGTH_CLASSES } from '../../domain/tuning';
import {
  estimateMinutes,
  type LengthBasis,
  type LengthClass,
  type WalkingPace,
} from '../../domain/walk';
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

const MOOD_FOR_JEV: Record<Mood, string> = {
  relaxed: 'wants a relaxed, easy-going walk at a gentle pace',
  energetic: 'is full of energy and wants a lively, active walk',
  adventurous: 'wants to explore somewhere new or a little out of the ordinary',
  tired: 'is tired and wants an easy walk that takes little effort',
  refresh: 'wants a change of scenery to clear their head',
};

function breedForJev(breed: Breed): string {
  switch (breed.kind) {
    case 'jkc':
      return JKC_BREEDS.find((entry) => entry.id === breed.id)?.en ?? breed.id;
    case 'mixed':
      return 'mixed breed';
    case 'other':
      return breed.text;
    default: {
      const _exhaustive: never = breed;
      return _exhaustive;
    }
  }
}

function ageForJev({ dog, now }: { dog: DogProfile; now: Date }): string {
  const months = ageInMonths({ birthMonth: dog.birthMonth, now });
  const age = `${Math.floor(months / 12)} years ${months % 12} months`;
  return dog.birthMonth.estimated ? `${age} (estimated)` : age;
}

export function dogState({ dog, now }: { dog: DogProfile; now: Date }): JsonObject {
  return {
    breed: breedForJev(dog.breed),
    age: ageForJev({ dog, now }),
    sex: dog.sex,
    weight: dog.weightKg === undefined ? 'not recorded' : `${dog.weightKg} kg`,
    memo: dog.dogMemo ?? null,
  };
}

function requestedWalkForJev(conditions: CourseConditions): string | null {
  const parts = [
    conditions.targetDistanceM === undefined
      ? null
      : `${(conditions.targetDistanceM / 1000).toFixed(1)} km`,
    conditions.targetTimeMin === undefined ? null : `${conditions.targetTimeMin} minutes`,
  ].filter((part) => part !== null);
  return parts.length === 0 ? null : parts.join(', ');
}

export function todayState(conditions: CourseConditions): JsonObject {
  return {
    ownerMood: conditions.mood === undefined ? null : `The Owner ${MOOD_FOR_JEV[conditions.mood]}.`,
    memo: conditions.todayMemo ?? null,
    requestedWalk: requestedWalkForJev(conditions),
  };
}

export type ConditionQuestions = {
  pace: ChoiceQuestion<WalkingPace>;
  lengthClass: ChoiceQuestion<LengthClass>;
  tooMuchLoad: NoulQuestion;
};

function lengthClassDescription({
  lengthClass,
  meaning,
}: {
  lengthClass: LengthClass;
  meaning: string;
}): string {
  const { upToM } = LENGTH_CLASSES[lengthClass];
  const reach = upToM === null ? 'longer than that' : `up to about ${(upToM / 1000).toFixed(1)} km`;
  return `${meaning} (${reach}).`;
}

export function conditionQuestions(): ConditionQuestions {
  return {
    pace: choice({
      ask: 'How fast does this dog usually walk on an everyday walk, given `dog.breed`, `dog.age`, `dog.weight` and `dog.memo`?',
      optionsNeutralFirst: [
        { id: 'normal', description: 'A typical pace for a healthy adult dog of its size.' },
        {
          id: 'slow',
          description:
            'Slower than typical: a small or short-legged breed, a puppy or senior, overweight, or a health problem that limits movement.',
        },
        {
          id: 'brisk',
          description:
            'Faster than typical: an energetic, athletic adult dog with no health limits.',
        },
      ],
    }),
    lengthClass: choice({
      ask: 'How long a walk suits this dog today, given `dog` and anything in `today.memo` about its health, weight, recent exercise or the weather?',
      optionsNeutralFirst: [
        {
          id: 'normal',
          description: lengthClassDescription({
            lengthClass: 'normal',
            meaning: 'An ordinary daily walk for this dog',
          }),
        },
        {
          id: 'short',
          description: lengthClassDescription({
            lengthClass: 'short',
            meaning: "A short walk, because of age, size, health or today's situation",
          }),
        },
        {
          id: 'long',
          description: lengthClassDescription({
            lengthClass: 'long',
            meaning: 'A long walk, because the dog needs or can enjoy more exercise today',
          }),
        },
      ],
    }),
    tooMuchLoad: noul({
      ask: 'Would the walk in `today.requestedWalk` be too much physical load for this dog today, given `dog` and `today.memo`? When `today.requestedWalk` is null, judge an ordinary walk for this dog. Answer yes only for a specific concern, such as an injury, an illness, old age, heat, or a walk far longer than this dog can manage.',
    }),
  };
}

export function interpretConditions({
  basis,
  answers,
}: {
  basis: LengthBasis;
  answers: JevAnswers<ConditionQuestions>;
}): Assessment {
  const warnings: ConditionWarning[] =
    answers.tooMuchLoad.probability > CONDITION_CHECK_THRESHOLD ? ['tooMuchLoad'] : [];
  return {
    pace: answers.pace.likeliest,
    length:
      basis.basis === 'judged'
        ? { basis: 'judged', lengthClass: answers.lengthClass.likeliest }
        : basis,
    warnings,
    judgedBy: 'jev',
  };
}

export function fallbackAssessment(basis: LengthBasis): Assessment {
  return {
    pace: 'normal',
    length: basis.basis === 'judged' ? { basis: 'judged', lengthClass: 'normal' } : basis,
    warnings: [],
    judgedBy: 'fallback',
  };
}

const UNKNOWN = 'unknown';

function shareForJev(share: number): string {
  if (share < 0.1) return 'almost none of the route';
  if (share < 0.35) return 'some of the route';
  if (share < 0.65) return 'about half of the route';
  if (share < 0.9) return 'most of the route';
  return 'almost all of the route';
}

function climbForJev(ascentM: number): string {
  const climb = `about ${Math.round(ascentM)} m of climbing`;
  if (ascentM < 10) return `flat (${climb})`;
  if (ascentM < 30) return `a few gentle slopes (${climb})`;
  if (ascentM < 60) return `some hills (${climb})`;
  return `hilly (${climb})`;
}

export function courseSummary({ course, pace }: { course: Course; pace: WalkingPace }): JsonObject {
  const minutes = estimateMinutes({ distanceM: course.distanceM, pace });
  return {
    length: `${(course.distanceM / 1000).toFixed(1)} km, about ${minutes} minutes at this dog's pace`,
    hills: climbForJev(course.ascentM),
    unpavedSurface: shareForJev(course.unpavedShare),
    besideParksAndGreenery:
      course.surroundings === null ? UNKNOWN : shareForJev(course.surroundings.greenShare),
    besideMainRoads:
      course.surroundings === null ? UNKNOWN : shareForJev(course.surroundings.mainRoadShare),
  };
}

type BodyFitKey = `body:${string}`;
type MoodFitKey = `mood:${string}`;
type UnsuitableKey = `unsuitable:${string}`;

export type FitQuestions = {
  [key: BodyFitKey | MoodFitKey]: ScoreQuestion;
  [key: UnsuitableKey]: NoulQuestion;
};

const bodyFitKey = (courseKey: string): BodyFitKey => `body:${courseKey}`;
const moodFitKey = (courseKey: string): MoodFitKey => `mood:${courseKey}`;
const unsuitableKey = (courseKey: string): UnsuitableKey => `unsuitable:${courseKey}`;

function bodyFitQuestion(course: JsonObject): ScoreQuestion {
  return score({
    ask: {
      course,
      question:
        "How well does `course` suit this dog's body today, given `dog` and anything in `today.memo` about its health, weight, recent exercise or the weather?",
    },
    levelsWorstToBest: [
      'Clearly bad for this dog today: far too long or strenuous, or its terrain conflicts with a stated health problem.',
      'A poor fit: noticeably more or less exercise than this dog needs today, or terrain that is hard on it.',
      "Acceptable: no problem for this dog's body, but nothing makes it a good match.",
      'A good fit: about the right amount of exercise, on terrain that suits this dog.',
      "An excellent fit: the right amount of exercise, and its terrain and surroundings are especially good for this dog's body today.",
    ],
  });
}

function moodFitQuestion(course: JsonObject): ScoreQuestion {
  return score({
    ask: {
      course,
      question: 'How well does `course` match how the Owner feels today, as described in `today.ownerMood`?',
    },
    levelsWorstToBest: [
      "Works against the Owner's mood: it would make the walk feel worse.",
      "A poor match: little about it fits the Owner's mood.",
      "Neutral: neither suits nor clashes with the Owner's mood.",
      "A good match: it fits the Owner's mood.",
      "An ideal match: exactly the kind of walk the Owner's mood calls for.",
    ],
  });
}

function unsuitableQuestion(course: JsonObject): NoulQuestion {
  return noul({
    ask: {
      course,
      question:
        'Is `course` clearly unsuitable for this dog today, because of a specific problem such as being far too long or strenuous for its age, or hills or rough ground for a dog with a joint, heart or breathing problem stated in `dog.memo` or `today.memo`? Answer no for a course that is merely imperfect.',
    },
  });
}

export function fitQuestions({
  courses,
  pace,
  hasMood,
}: {
  courses: readonly Course[];
  pace: WalkingPace;
  hasMood: boolean;
}): FitQuestions {
  const questions: FitQuestions = {};
  for (const course of courses) {
    const summary = courseSummary({ course, pace });
    questions[bodyFitKey(course.key)] = bodyFitQuestion(summary);
    questions[unsuitableKey(course.key)] = unsuitableQuestion(summary);
    if (hasMood) questions[moodFitKey(course.key)] = moodFitQuestion(summary);
  }
  return questions;
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
    unsuitable: answers[unsuitableKey(courseKey)].probability,
  };
}
