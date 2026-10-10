/**
 * The judge: every judgment the proposal needs from Jev, as two total functions.
 * Neither throws for Jev problems; each has the spec's fallback built in:
 *
 *   judgeConditions → Assessment       (Jev down ⇒ fallbackAssessment: never block)
 *   judgeCourseFits → CourseScoring    (Jev down ⇒ { kind: 'byLength' }: 「おすすめ順ではありません」)
 *
 * Each is ONE Jev request: independent questions over the same state go together, and
 * Jev answers them in parallel.
 *
 * Usage (from convex/proposalRuns.ts):
 *   const assessment = await judgeConditions({ dog, conditions, now: new Date() });
 *   const scoring = await judgeCourseFits({ dog, conditions, assessment, courses, now: new Date() });
 *
 * `ask` is injectable for tests; production callers omit it. Everything under
 * `./internal/` is private to this directory.
 */
import type { CourseConditions } from '../domain/courseConditions';
import type { DogProfile } from '../domain/dogProfile';
import type { Assessment, Course, CourseScoring } from '../domain/proposal';
import { askJev, type AskJev } from './internal/jev';

export async function judgeConditions(
  input: { dog: DogProfile; conditions: CourseConditions; now: Date },
  ask: AskJev = askJev,
): Promise<Assessment> {
  void input;
  void ask;
  // TODO:
  //   const basis = lengthBasisOf(input.conditions);
  //   const result = await ask(
  //     { dog: dogState(input.dog, input.now), today: todayState(input.conditions) },
  //     conditionQuestions(input.conditions, basis),
  //   );
  //   return result.ok ? interpretConditions(basis, result.answers) : fallbackAssessment(basis);
  //   (log result.failure for tuning; do not surface it to the Owner)
  throw new Error('not implemented');
}

/**
 * One Jev request for all Course Candidates: the state holds the dog, today and every
 * course keyed by `course.key`; the questions are Body Fit (and Mood Fit when a Mood was
 * given) per course. All-or-nothing by construction: one request either answers every
 * course or none, so a half-scored list (which has no defined ranking) cannot happen.
 */
export async function judgeCourseFits(
  input: {
    dog: DogProfile;
    conditions: CourseConditions;
    assessment: Assessment;
    courses: readonly Course[];
    now: Date;
  },
  ask: AskJev = askJev,
): Promise<CourseScoring> {
  void input;
  void ask;
  // TODO:
  //   const result = await ask(
  //     { dog: dogState(...), today: todayState(...), courses: coursesState(input.courses, input.assessment.pace) },
  //     fitQuestions(input.courses, input.conditions.mood !== undefined),
  //   );
  //   ok   → { kind: 'byFit', scored: input.courses.map((course) => ({ course, fit: interpretFit(result.answers, course.key) })) }
  //   else → { kind: 'byLength', courses: [...input.courses] }
  throw new Error('not implemented');
}
