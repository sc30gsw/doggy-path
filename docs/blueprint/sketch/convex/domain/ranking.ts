import type { Course, CourseScoring, Fit } from './proposal';
import { FIT_WEIGHTS, SHOWN_COURSE_COUNT } from './tuning';

export type FitKind = keyof typeof FIT_WEIGHTS;

export type RankedCourses =
  | { order: 'recommended'; courses: Array<{ course: Course; reason: FitKind }> }
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
        courses: [...scoring.scored]
          .sort(
            (a, b) =>
              weightedScore(b.fit) - weightedScore(a.fit) || a.course.key.localeCompare(b.course.key),
          )
          .slice(0, SHOWN_COURSE_COUNT)
          .map(({ course, fit }) => ({ course, reason: strongerFit(fit) })),
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

function weightedScore(fit: Fit): number {
  return fit.mood === null ? fit.body : FIT_WEIGHTS.body * fit.body + FIT_WEIGHTS.mood * fit.mood;
}

function strongerFit(fit: Fit): FitKind {
  return fit.mood !== null && fit.mood > fit.body ? 'mood' : 'body';
}
