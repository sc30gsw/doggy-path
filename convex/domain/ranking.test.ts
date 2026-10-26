import { describe, expect, test } from 'bun:test';

import type { Course, Fit } from './proposal';
import { rankCourses } from './ranking';
import { UNSUITABLE_THRESHOLD } from './tuning';

function course(key: string, distanceM: number): Course {
  return {
    key,
    path: [],
    distanceM,
    ascentM: 0,
    unpavedShare: 0,
    surroundings: { kind: 'unknown' },
  };
}

function fit(body: number, mood: number | null, unsuitableProbability: number): Fit {
  return {
    bodyPositionTowardBest: body,
    moodPositionTowardBest: mood,
    unsuitableProbability,
  };
}

describe('rankCourses', () => {
  test('fit ranking keeps suitable courses ahead of unsuitable ones, then higher weight, then key', () => {
    const scored = [
      { course: course('low', 1), fit: fit(0, 1, 0) },
      { course: course('high', 1), fit: fit(1, 0, 0) },
      { course: course('body-only', 1), fit: fit(0.5, null, UNSUITABLE_THRESHOLD) },
      { course: course('zeta', 1), fit: fit(0, 1, 0) },
      { course: course('bad', 1), fit: fit(1, 1, UNSUITABLE_THRESHOLD + 0.01) },
    ];
    const ranked = rankCourses({ scoring: { kind: 'byFit', scored }, targetLengthM: 1 });

    expect(ranked.order).toBe('recommended');
    if (ranked.order !== 'recommended') return;
    expect(ranked.courses.map((entry) => entry.course.key)).toEqual(['high', 'body-only', 'low']);
    expect(scored.map((entry) => entry.course.key)).toEqual([
      'low',
      'high',
      'body-only',
      'zeta',
      'bad',
    ]);
  });

  test('the threshold is exclusive, and the reason is the higher raw position', () => {
    const cases = [
      {
        key: 'tied',
        scoredFit: fit(0.4, 0.4, UNSUITABLE_THRESHOLD),
        reason: 'body' as const,
        unsuitable: false,
      },
      { key: 'mood', scoredFit: fit(0.4, 0.41, 0), reason: 'mood' as const, unsuitable: false },
      {
        key: 'body',
        scoredFit: fit(0.9, null, UNSUITABLE_THRESHOLD + 0.01),
        reason: 'body' as const,
        unsuitable: true,
      },
    ];
    for (const entry of cases) {
      const ranked = rankCourses({
        scoring: {
          kind: 'byFit',
          scored: [{ course: course(entry.key, 1), fit: entry.scoredFit }],
        },
        targetLengthM: 1,
      });
      expect(ranked.order).toBe('recommended');
      if (ranked.order !== 'recommended') return;
      expect(ranked.courses[0]).toMatchObject({
        reason: entry.reason,
        unsuitable: entry.unsuitable,
      });
    }
  });

  test('an unsuitable course sorts after a suitable one', () => {
    const ranked = rankCourses({
      scoring: {
        kind: 'byFit',
        scored: [
          { course: course('bad', 1), fit: fit(1, 1, UNSUITABLE_THRESHOLD + 0.01) },
          { course: course('ok', 1), fit: fit(0, 0, UNSUITABLE_THRESHOLD) },
        ],
      },
      targetLengthM: 1,
    });
    expect(ranked.order).toBe('recommended');
    if (ranked.order !== 'recommended') return;
    expect(ranked.courses[0]?.course.key).toBe('ok');
    expect(ranked.courses[0]?.unsuitable).toBe(false);
    expect(ranked.courses[1]?.unsuitable).toBe(true);
  });

  test('length ranking sorts by distance from the target, then by key, and does not rewrite the input', () => {
    const courses = [
      course('far', 9_000),
      course('b', 2_000),
      course('a', 0),
      course('near', 1_100),
    ];
    const ranked = rankCourses({ scoring: { kind: 'byLength', courses }, targetLengthM: 1_000 });

    expect(ranked.order).toBe('byLength');
    if (ranked.order !== 'byLength') return;
    expect(ranked.courses.map((entry) => entry.key)).toEqual(['near', 'a', 'b']);
    expect(courses.map((entry) => entry.key)).toEqual(['far', 'b', 'a', 'near']);
  });
});
