import { describe, expect, test } from 'bun:test';

import { advance, type Assessment, type CourseScoring, type ProposalState } from './proposal';
import { RETRY_COOLDOWN_MS } from './tuning';

const now = 1_700_000_000_000;

const clear: Assessment = {
  pace: 'normal',
  length: { basis: 'distance', targetDistanceM: 1_000 },
  warnings: [],
  judgedBy: 'fallback',
};

const warned: Assessment = { ...clear, warnings: ['tooMuchLoad'], judgedBy: 'jev' };

const scoring: CourseScoring = { kind: 'byLength', courses: [] };

const checking: ProposalState = { phase: 'checking' };

const awaiting: ProposalState = { phase: 'awaitingConfirmation', assessment: warned };

const building: ProposalState = { phase: 'building', assessment: clear };

const ready: ProposalState = { phase: 'ready', assessment: clear, scoring };

const failedCheck: ProposalState = {
  phase: 'failed',
  failedDuring: 'checking',
  reason: 'timedOut',
  failedAt: now,
};

const failedBuild: ProposalState = {
  phase: 'failed',
  failedDuring: 'building',
  assessment: clear,
  reason: 'noLoopFound',
  failedAt: now,
};

describe('advance', () => {
  test('a clear assessment leaves checking and starts the build', () => {
    expect(
      advance({ state: checking, event: { type: 'assessed', assessment: clear }, now }),
    ).toEqual({
      kind: 'advanced',
      next: { phase: 'building', assessment: clear },
      startRun: true,
    });
  });

  test('warnings park the proposal until the owner confirms', () => {
    expect(
      advance({ state: checking, event: { type: 'assessed', assessment: warned }, now }),
    ).toEqual({
      kind: 'advanced',
      next: { phase: 'awaitingConfirmation', assessment: warned },
      startRun: false,
    });
  });

  test('confirmation keeps the warned assessment and starts the build', () => {
    expect(advance({ state: awaiting, event: { type: 'confirmed' }, now })).toEqual({
      kind: 'advanced',
      next: { phase: 'building', assessment: warned },
      startRun: true,
    });
  });

  test('a built scoring marks the proposal ready and does not start another run', () => {
    expect(advance({ state: building, event: { type: 'built', scoring }, now })).toEqual({
      kind: 'advanced',
      next: { phase: 'ready', assessment: clear, scoring },
      startRun: false,
    });
  });

  test('failure during checking records that phase and the clock', () => {
    expect(
      advance({ state: checking, event: { type: 'failed', reason: 'internal' }, now }),
    ).toEqual({
      kind: 'advanced',
      next: { phase: 'failed', failedDuring: 'checking', reason: 'internal', failedAt: now },
      startRun: false,
    });
  });

  test('failure during building keeps the assessment', () => {
    expect(
      advance({ state: building, event: { type: 'failed', reason: 'routingUnavailable' }, now }),
    ).toEqual({
      kind: 'advanced',
      next: {
        phase: 'failed',
        failedDuring: 'building',
        assessment: clear,
        reason: 'routingUnavailable',
        failedAt: now,
      },
      startRun: false,
    });
  });

  test('retry before the cooldown is ignored', () => {
    expect(
      advance({
        state: failedCheck,
        event: { type: 'retryRequested' },
        now: now + RETRY_COOLDOWN_MS - 1,
      }),
    ).toEqual({ kind: 'ignored' });
  });

  test('retry at the cooldown restarts the phase that failed', () => {
    const atCooldown = now + RETRY_COOLDOWN_MS;
    expect(
      advance({ state: failedCheck, event: { type: 'retryRequested' }, now: atCooldown }),
    ).toEqual({
      kind: 'advanced',
      next: { phase: 'checking' },
      startRun: true,
    });
    expect(
      advance({ state: failedBuild, event: { type: 'retryRequested' }, now: atCooldown }),
    ).toEqual({
      kind: 'advanced',
      next: { phase: 'building', assessment: clear },
      startRun: true,
    });
  });

  test('an event for another phase is ignored', () => {
    const ignored = { kind: 'ignored' } as const;
    expect(
      advance({ state: building, event: { type: 'assessed', assessment: clear }, now }),
    ).toEqual(ignored);
    expect(advance({ state: checking, event: { type: 'confirmed' }, now })).toEqual(ignored);
    expect(advance({ state: ready, event: { type: 'built', scoring }, now })).toEqual(ignored);
    expect(advance({ state: ready, event: { type: 'failed', reason: 'internal' }, now })).toEqual(
      ignored,
    );
    expect(
      advance({ state: awaiting, event: { type: 'failed', reason: 'internal' }, now }),
    ).toEqual(ignored);
    expect(
      advance({ state: failedCheck, event: { type: 'failed', reason: 'internal' }, now }),
    ).toEqual(ignored);
    expect(advance({ state: checking, event: { type: 'retryRequested' }, now })).toEqual(ignored);
  });
});
