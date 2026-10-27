import { describe, expect, test } from 'bun:test';

import type { Doc, Id } from '../_generated/dataModel';
import type { Assessment, Course, ProposalState } from './proposal';
import { toProposalView } from './proposalView';
import { RETRY_COOLDOWN_MS } from './tuning';
import { estimateMinutes } from './walk';

function course(key: string, distanceM: number): Course {
  return {
    key,
    path: [{ latitude: 35, longitude: 139 }],
    distanceM,
    ascentM: 0,
    unpavedShare: 0,
    surroundings: { kind: 'unknown' },
  };
}

function doc(state: ProposalState): Doc<'proposals'> {
  return {
    _id: 'proposals:test' as Id<'proposals'>,
    _creationTime: 0,
    userId: 'users:test' as Id<'users'>,
    attempt: 1,
    conditions: { mood: 'relaxed' },
    startPoint: { point: { latitude: 35.6, longitude: 139.7 }, source: 'device' },
    dogSnapshot: {
      dogName: 'Pochi',
      breed: { kind: 'mixed' },
      birthMonth: { year: 2020, month: 4, estimated: false },
      sex: 'female',
    },
    state,
  };
}

const clear: Assessment = {
  pace: 'normal',
  length: { basis: 'distance', targetDistanceM: 1_000 },
  warnings: [],
  judgedBy: 'fallback',
};

describe('toProposalView', () => {
  test('copies the proposal identity and maps each unfinished or blocked phase', () => {
    const checking = toProposalView(doc({ phase: 'checking' }));
    expect(checking.id).toBe(doc({ phase: 'checking' })._id);
    expect(checking.dogName).toBe('Pochi');
    expect(checking.conditions).toEqual({ mood: 'relaxed' });
    expect(checking.startPoint.source).toBe('device');
    expect(checking.status).toEqual({ kind: 'working', step: 'checking' });

    expect(toProposalView(doc({ phase: 'building', assessment: clear })).status).toEqual({
      kind: 'working',
      step: 'building',
    });
    expect(
      toProposalView(
        doc({
          phase: 'awaitingConfirmation',
          assessment: { ...clear, warnings: ['targetsInconsistent'] },
        }),
      ).status,
    ).toEqual({ kind: 'needsConfirmation', warnings: ['targetsInconsistent'] });
  });

  test('a failure exposes the reason and the moment a retry is allowed', () => {
    const failedAt = 1_700_000_000_000;
    const view = toProposalView(
      doc({ phase: 'failed', failedDuring: 'checking', reason: 'timedOut', failedAt }),
    );
    expect(view.status).toEqual({
      kind: 'failed',
      reason: 'timedOut',
      retryableAt: failedAt + RETRY_COOLDOWN_MS,
    });
  });

  test('a ready proposal shows ranked courses with a pace estimate', () => {
    const near = course('near', 1_000);
    const far = course('far', 5_000);
    const byLength = toProposalView(
      doc({
        phase: 'ready',
        assessment: clear,
        scoring: { kind: 'byLength', courses: [far, near] },
      }),
    );
    expect(byLength.status).toEqual({
      kind: 'ready',
      shown: {
        order: 'byLength',
        bestFirst: [
          {
            key: 'near',
            path: near.path,
            distanceM: 1_000,
            estimatedMinutes: estimateMinutes({ distanceM: 1_000, pace: 'normal' }),
          },
          {
            key: 'far',
            path: far.path,
            distanceM: 5_000,
            estimatedMinutes: estimateMinutes({ distanceM: 5_000, pace: 'normal' }),
          },
        ],
      },
    });

    const byFit = toProposalView(
      doc({
        phase: 'ready',
        assessment: clear,
        scoring: {
          kind: 'byFit',
          scored: [
            {
              course: near,
              fit: {
                bodyPositionTowardBest: 0.2,
                moodPositionTowardBest: 0.9,
                unsuitableProbability: 0,
              },
            },
            {
              course: far,
              fit: {
                bodyPositionTowardBest: 1,
                moodPositionTowardBest: null,
                unsuitableProbability: 1,
              },
            },
          ],
        },
      }),
    );
    expect(byFit.status).toMatchObject({
      kind: 'ready',
      shown: {
        order: 'recommended',
        allUnsuitable: false,
        bestFirst: [
          { key: 'near', reason: 'mood', unsuitable: false },
          { key: 'far', reason: 'body', unsuitable: true },
        ],
      },
    });
  });
});
