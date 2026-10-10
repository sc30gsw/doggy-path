import type { Course, CourseScoring, Fit } from './proposal';
import { FIT_WEIGHTS, SHOWN_COURSE_COUNT, UNSUITABLE_THRESHOLD } from './tuning';

export type FitKind = keyof typeof FIT_WEIGHTS;

export type RecommendedCourse = { course: Course; reason: FitKind; unsuitable: boolean };

export type RankedCourses =
  | { order: 'recommended'; courses: RecommendedCourse[] }
  | { order: 'byLength'; courses: Course[] };

export function rankCourses({
  scoring,
  targetLengthM,
}: {
  scoring: CourseScoring;
  targetLengthM: number;
}): RankedCourses {
  switch (scoring.kind) {
    case 'byFit':
      return {
        order: 'recommended',
        courses: scoring.scored
          .map(({ course, fit }) => ({ course, fit, unsuitable: isUnsuitable(fit) }))
          .sort(
            (a, b) =>
              Number(a.unsuitable) - Number(b.unsuitable) ||
              weightedScore(b.fit) - weightedScore(a.fit) ||
              a.course.key.localeCompare(b.course.key),
          )
          .slice(0, SHOWN_COURSE_COUNT)
          .map(({ course, fit, unsuitable }) => ({ course, reason: strongerFit(fit), unsuitable })),
      };
    case 'byLength': {
      const offTarget = (course: Course) => Math.abs(course.distanceM - targetLengthM);
      return {
        order: 'byLength',
        courses: [...scoring.courses]
          .sort((a, b) => offTarget(a) - offTarget(b) || a.key.localeCompare(b.key))
          .slice(0, SHOWN_COURSE_COUNT),
      };
    }
    default: {
      const _exhaustive: never = scoring;
      return _exhaustive;
    }
  }
}

function isUnsuitable(fit: Fit): boolean {
  return fit.unsuitable > UNSUITABLE_THRESHOLD;
}

function weightedScore(fit: Fit): number {
  return fit.mood === null ? fit.body : FIT_WEIGHTS.body * fit.body + FIT_WEIGHTS.mood * fit.mood;
}

function strongerFit(fit: Fit): FitKind {
  return fit.mood !== null && fit.mood > fit.body ? 'mood' : 'body';
}
