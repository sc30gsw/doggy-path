import { describe, expect, test } from 'bun:test';

import type { Course } from '../../domain/proposal';
import { LENGTH_CLASSES } from '../../domain/tuning';
import { readAnswers } from './jev';
import { conditionQuestions, fitQuestions } from './questions';

const cjk = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u;

function promptText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(promptText);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(promptText);
  return [];
}

function course(key: string): Course {
  return {
    key,
    path: [],
    distanceM: 2_200,
    ascentM: 12,
    unpavedShare: 0.5,
    surroundings: { kind: 'known', greenShare: 0.2, mainRoadShare: 0.8 },
  };
}

function reach(lengthClass: 'short' | 'normal'): string {
  const upToM = LENGTH_CLASSES[lengthClass].upToM;
  if (upToM === null) throw new Error(`${lengthClass} has no upper bound`);
  return `up to about ${(upToM / 1000).toFixed(1)} km`;
}

describe('conditionQuestions', () => {
  test('asks pace and length with the neutral option first, and load as a probability', () => {
    const questions = conditionQuestions();
    expect(questions.pace.wire.type).toBe('choice');
    expect(questions.lengthClass.wire.type).toBe('choice');
    expect(questions.tooMuchLoad.wire.type).toBe('noul');
    if (questions.pace.wire.type !== 'choice' || questions.lengthClass.wire.type !== 'choice')
      return;

    expect(Object.keys(questions.pace.wire.criteria)).toEqual(['normal', 'slow', 'brisk']);
    expect(Object.keys(questions.lengthClass.wire.criteria)).toEqual(['normal', 'short', 'long']);
    expect(questions.lengthClass.wire.criteria.normal).toContain(reach('normal'));
    expect(questions.lengthClass.wire.criteria.short).toContain(reach('short'));
    expect(questions.lengthClass.wire.criteria.long).toContain('longer than that');

    const prose = [
      questions.pace.wire.instructions,
      questions.pace.wire.criteria,
      questions.lengthClass.wire.instructions,
      questions.lengthClass.wire.criteria,
      questions.tooMuchLoad.wire.instructions,
    ].flatMap(promptText);
    expect(prose.length).toBeGreaterThan(0);
    expect(prose.some((text) => cjk.test(text))).toBe(false);
  });

  test('a complete wire response reads back as pace, length, and load', () => {
    const result = readAnswers({
      questions: conditionQuestions(),
      body: {
        model: 'jev-1.13.0',
        answers: {
          pace: {
            type: 'choice',
            choice: 'slow',
            probabilities: { normal: 0.2, slow: 0.7, brisk: 0.1 },
            confidence: 0.7,
          },
          lengthClass: {
            type: 'choice',
            choice: 'short',
            probabilities: { normal: 0.1, short: 0.8, long: 0.1 },
            confidence: 0.8,
          },
          tooMuchLoad: { type: 'noul', noul: 0.2 },
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      answers: {
        pace: { likeliest: 'slow', confidence: 0.7 },
        lengthClass: { likeliest: 'short', confidence: 0.8 },
        tooMuchLoad: { probability: 0.2 },
      },
    });
  });
});

describe('fitQuestions', () => {
  test('asks body and unsuitable for every course, and mood only when the owner has one', () => {
    const courses = [course('east'), course('west')];
    const withoutMood = fitQuestions({ courses, pace: 'normal', hasMood: false });
    expect(Object.keys(withoutMood).sort()).toEqual(
      ['body:east', 'body:west', 'unsuitable:east', 'unsuitable:west'].sort(),
    );
    expect(withoutMood['body:east']?.wire.type).toBe('score');
    expect(withoutMood['unsuitable:east']?.wire.type).toBe('noul');
    expect(withoutMood['mood:east']).toBeUndefined();

    const withMood = fitQuestions({ courses, pace: 'normal', hasMood: true });
    expect(withMood['mood:west']?.wire.type).toBe('score');

    const bodyQuestion = withoutMood['body:east'];
    if (bodyQuestion?.wire.type !== 'score') throw new Error('expected a score question');
    const top = bodyQuestion.wire.criteria.length - 1;
    expect(
      bodyQuestion.read({ type: 'score', score: 0, probabilities: {}, confidence: 1 }),
    ).toEqual({
      positionTowardBest: 0,
    });
    expect(
      bodyQuestion.read({ type: 'score', score: top, probabilities: {}, confidence: 1 }),
    ).toEqual({
      positionTowardBest: 1,
    });
    expect(promptText(bodyQuestion.wire).some((text) => cjk.test(text))).toBe(false);
  });

  test('the fit answers read back onto the course keys', () => {
    const questions = fitQuestions({ courses: [course('east')], pace: 'brisk', hasMood: true });
    const moodQuestion = questions['mood:east'];
    if (moodQuestion?.wire.type !== 'score') throw new Error('expected a mood score');
    const top = moodQuestion.wire.criteria.length - 1;
    const result = readAnswers({
      questions,
      body: {
        model: 'jev-1.13.0',
        answers: {
          'body:east': { type: 'score', score: 0, probabilities: { '0': 1 }, confidence: 1 },
          'mood:east': {
            type: 'score',
            score: top,
            probabilities: { [String(top)]: 1 },
            confidence: 1,
          },
          'unsuitable:east': { type: 'noul', noul: 0.1 },
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answers['body:east']).toEqual({ positionTowardBest: 0 });
    expect(result.answers['mood:east']?.positionTowardBest).toBe(1);
    expect(result.answers['unsuitable:east']).toEqual({ probability: 0.1 });
  });
});
