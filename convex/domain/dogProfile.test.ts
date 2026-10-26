import { describe, expect, test } from 'bun:test';

import { ageInMonths, type BirthMonth } from './dogProfile';

const birthMonth: BirthMonth = { year: 2024, month: 3, estimated: false };

describe('ageInMonths', () => {
  test('counts calendar months and clamps a future birth month to zero', () => {
    expect(ageInMonths({ birthMonth, now: new Date(2024, 2, 31) })).toBe(0);
    expect(ageInMonths({ birthMonth, now: new Date(2024, 3, 1) })).toBe(1);
    expect(ageInMonths({ birthMonth, now: new Date(2025, 2, 1) })).toBe(12);
    expect(ageInMonths({ birthMonth, now: new Date(2024, 1, 28) })).toBe(0);
    expect(
      ageInMonths({
        birthMonth: { year: 2023, month: 12, estimated: false },
        now: new Date(2024, 0, 15),
      }),
    ).toBe(1);
  });

  test('an estimated birth month does not change the count', () => {
    const now = new Date(2026, 5, 1);
    expect(ageInMonths({ birthMonth: { ...birthMonth, estimated: true }, now })).toBe(
      ageInMonths({ birthMonth, now }),
    );
  });
});
