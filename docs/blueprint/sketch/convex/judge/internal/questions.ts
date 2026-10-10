/**
 * doggy-path's questions to Jev: structured state in, question set out, answers in,
 * domain value out. Pure (no fetch, no ctx), so every prompt and every interpretation
 * is unit-testable with plain objects.
 *
 * Private to `convex/judge/`; the rest of the backend calls `../index.ts`.
 */
import type { CourseConditions } from '../../domain/courseConditions';
import { moodLabel } from '../../domain/courseConditions';
import type { DogProfile } from '../../domain/dogProfile';
import { ageInMonths, breedLabel } from '../../domain/dogProfile';
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

// ── State ─────────────────────────────────────────────────────────────────────────────

/** The dog as Jev sees it. Age is derived here; Birth Month never leaves the server raw. */
export function dogState(profile: DogProfile, now: Date): JsonObject {
  return {
    breed: breedLabel(profile.breed),
    ageMonths: ageInMonths(profile.birthMonth, now),
    ageIsEstimated: profile.birthMonth.estimated,
    sex: profile.sex,
    weightKg: profile.weightKg ?? null,
    dogMemo: profile.dogMemo ?? null,
  };
}

/** Today's situation as Jev sees it. Labels, not ids, so Jev reads Japanese the Owner wrote. */
export function todayState(conditions: CourseConditions): JsonObject {
  return {
    ownerMood: conditions.mood ? moodLabel(conditions.mood) : null,
    todayMemo: conditions.todayMemo ?? null,
    targetDistanceKm:
      conditions.targetDistanceM === undefined ? null : conditions.targetDistanceM / 1000,
    targetTimeMin: conditions.targetTimeMin ?? null,
  };
}

// ── Request 1: Condition Check + pace + (maybe) length ────────────────────────────────

export type ConditionQuestions = {
  pace: ChoiceQuestion<WalkingPace>;
  /** Asked only when the basis is `judged`. */
  lengthClass?: ChoiceQuestion<LengthClass>;
  /** Asked only when both Target Distance and Target Time are present. */
  targetsConsistent?: NoulQuestion;
  /** Always asked: a Today's Memo like 「足を痛めている」 matters even with no targets. */
  tooMuchLoad: NoulQuestion;
};

/**
 * All independent first-round questions in ONE request (Jev runs them in parallel).
 * Walking Pace is always asked: it also drives every time estimate shown later.
 */
export function conditionQuestions(
  conditions: CourseConditions,
  basis: LengthBasis,
): ConditionQuestions {
  void conditions;
  void basis;
  void choice;
  void noul;
  // TODO: build the set with Japanese prompts; include optional entries per the rules above.
  throw new Error('not implemented');
}

/** Answers → Assessment. Warnings when P(consistent) < 1 − threshold or P(tooMuchLoad) > threshold. */
export function interpretConditions(
  basis: LengthBasis,
  answers: JevAnswers<ConditionQuestions>,
): Assessment {
  void basis;
  void answers;
  void CONDITION_CHECK_THRESHOLD;
  // TODO: pace = answers.pace.likeliest;
  //       length = basis.basis === 'judged' ? { basis: 'judged', lengthClass: answers.lengthClass?.likeliest ?? 'normal' } : basis;
  //       warnings from the two Noul answers vs CONDITION_CHECK_THRESHOLD; judgedBy 'jev'.
  throw new Error('not implemented');
}

/** Jev unavailable: never block. No warnings, normal pace, normal length. */
export function fallbackAssessment(basis: LengthBasis): Assessment {
  return {
    pace: 'normal',
    length: basis.basis === 'judged' ? { basis: 'judged', lengthClass: 'normal' } : basis,
    warnings: [],
    judgedBy: 'fallback',
  };
}

// ── Request 2: Body Fit / Mood Fit for every Course Candidate, in one request ─────────

/**
 * Keyed `body:<course.key>` and `mood:<course.key>`. Each prompt names the course it is
 * about (`courses[<key>]` in the state), so the questions stay independent.
 */
export type FitQuestions = { readonly [questionKey: string]: ScoreQuestion };

export function bodyFitKey(courseKey: string): string {
  return `body:${courseKey}`;
}

export function moodFitKey(courseKey: string): string {
  return `mood:${courseKey}`;
}

/**
 * Provider-neutral facts per course, keyed by `course.key`, with the time estimate at this
 * dog's pace. Never the path.
 */
export function coursesState(courses: readonly Course[], pace: WalkingPace): JsonObject {
  void courses;
  void pace;
  // TODO: Object.fromEntries(courses.map((c) => [c.key, { distanceKm, estimatedMinutes
  //         (estimateMinutes), ascentM, unpavedShare, greenShare, mainRoadShare
  //         (null when surroundings is null) }])).
  throw new Error('not implemented');
}

/** Body Fit for every course, plus Mood Fit for every course when the Owner gave a Mood. */
export function fitQuestions(courses: readonly Course[], hasMood: boolean): FitQuestions {
  void courses;
  void hasMood;
  void score;
  // TODO: per course, a Score over 5 described levels (worst → best) with a Japanese prompt
  //       that names `courses[<key>]`; keys from bodyFitKey / moodFitKey.
  throw new Error('not implemented');
}

/**
 * One course's Fit out of the shared answers. `askJev` already reported a missing answer as
 * `malformed` (→ the `byLength` fallback), so the throw below is unreachable in practice.
 */
export function interpretFit(answers: JevAnswers<FitQuestions>, courseKey: string): Fit {
  const body = answers[bodyFitKey(courseKey)];
  if (body === undefined) throw new Error(`Jev answered no Body Fit for ${courseKey}`);
  return { body: body.position, mood: answers[moodFitKey(courseKey)]?.position ?? null };
}
