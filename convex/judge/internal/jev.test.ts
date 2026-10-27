import { describe, expect, test } from 'bun:test';

import { choice, noul, readAnswers, score } from './jev';

const questions = {
  pace: choice({
    ask: 'How fast?',
    optionsNeutralFirst: [
      { id: 'normal', description: 'Typical.' },
      { id: 'slow', description: 'Slower.' },
    ],
  }),
  load: noul({ ask: 'Too much?' }),
  fit: score({
    ask: { question: 'How well?' },
    levelsWorstToBest: ['bad', 'ok', 'good'],
  }),
};

function body(answers: Record<string, unknown>) {
  return { model: 'jev-1.13.0', answers };
}

describe('readAnswers', () => {
  test('reads each question and ignores an answer the question set did not ask', () => {
    const result = readAnswers({
      questions,
      body: body({
        pace: {
          type: 'choice',
          choice: 'slow',
          probabilities: { normal: 0.2, slow: 0.8 },
          confidence: 0.8,
        },
        load: { type: 'noul', noul: 0.25 },
        fit: { type: 'score', score: 2, probabilities: { '2': 1 }, confidence: 1 },
        extra: { type: 'noul', noul: 1 },
      }),
    });

    expect(result).toEqual({
      ok: true,
      answers: {
        pace: { likeliest: 'slow', confidence: 0.8 },
        load: { probability: 0.25 },
        fit: { positionTowardBest: 1 },
      },
    });
  });

  test('a body that is not a wire response is malformed', () => {
    expect(readAnswers({ questions, body: null }).ok).toBe(false);
    const missing = readAnswers({ questions, body: { model: 'jev-1.13.0' } });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.failure.kind).toBe('malformed');
  });

  test('a missing, mistyped, or unusable answer names that question', () => {
    const cases = [
      {
        key: 'pace',
        response: body({
          load: { type: 'noul', noul: 0 },
          fit: { type: 'score', score: 0, probabilities: {}, confidence: 0 },
        }),
      },
      {
        key: 'pace',
        response: body({
          pace: { type: 'noul', noul: 0.5 },
          load: { type: 'noul', noul: 0 },
          fit: { type: 'score', score: 0, probabilities: {}, confidence: 0 },
        }),
      },
      {
        key: 'pace',
        response: body({
          pace: {
            type: 'choice',
            choice: 'brisk',
            probabilities: { normal: 0.5, slow: 0.5 },
            confidence: 0.5,
          },
          load: { type: 'noul', noul: 0 },
          fit: { type: 'score', score: 0, probabilities: {}, confidence: 0 },
        }),
      },
      {
        key: 'pace',
        response: body({
          pace: {
            type: 'choice',
            choice: 'slow',
            probabilities: { slow: 1 },
            confidence: 1,
          },
          load: { type: 'noul', noul: 0 },
          fit: { type: 'score', score: 0, probabilities: {}, confidence: 0 },
        }),
      },
      {
        key: 'fit',
        response: body({
          pace: {
            type: 'choice',
            choice: 'slow',
            probabilities: { normal: 0, slow: 1 },
            confidence: 1,
          },
          load: { type: 'noul', noul: 0 },
          fit: { type: 'score', score: 3, probabilities: {}, confidence: 1 },
        }),
      },
    ];

    for (const entry of cases) {
      const result = readAnswers({ questions, body: entry.response });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failure).toEqual({
        kind: 'malformed',
        detail: expect.stringContaining(entry.key),
      });
    }
  });
});
