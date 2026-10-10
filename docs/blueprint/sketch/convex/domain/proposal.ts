import { v, type Infer } from 'convex/values';

import { latLngValidator } from './courseConditions';
import { RETRY_COOLDOWN_MS } from './tuning';
import { lengthDecisionValidator, walkingPaceValidator } from './walk';

export const conditionWarningValidator = v.union(
  v.literal('targetsInconsistent'),
  v.literal('tooMuchLoad'),
);
export type ConditionWarning = Infer<typeof conditionWarningValidator>;

export const assessmentValidator = v.object({
  pace: walkingPaceValidator,
  length: lengthDecisionValidator,
  warnings: v.array(conditionWarningValidator),
  judgedBy: v.union(v.literal('jev'), v.literal('fallback')),
});
export type Assessment = Infer<typeof assessmentValidator>;

export const courseValidator = v.object({
  key: v.string(),
  path: v.array(latLngValidator),
  distanceM: v.number(),
  ascentM: v.number(),
  unpavedShare: v.number(),
  surroundings: v.union(
    v.object({ kind: v.literal('unknown') }),
    v.object({ kind: v.literal('known'), greenShare: v.number(), mainRoadShare: v.number() }),
  ),
});
export type Course = Infer<typeof courseValidator>;

export const MAX_PATH_POINTS = 300;

export const fitValidator = v.object({
  bodyPositionTowardBest: v.number(),
  moodPositionTowardBest: v.union(v.null(), v.number()),
  unsuitableProbability: v.number(),
});
export type Fit = Infer<typeof fitValidator>;

export const courseScoringValidator = v.union(
  v.object({
    kind: v.literal('byFit'),
    scored: v.array(v.object({ course: courseValidator, fit: fitValidator })),
  }),
  v.object({ kind: v.literal('byLength'), courses: v.array(courseValidator) }),
);
export type CourseScoring = Infer<typeof courseScoringValidator>;

export const failureReasonValidator = v.union(
  v.literal('routingUnavailable'),
  v.literal('noLoopFound'),
  v.literal('timedOut'),
  v.literal('internal'),
);
export type FailureReason = Infer<typeof failureReasonValidator>;

export const proposalStateValidator = v.union(
  v.object({ phase: v.literal('checking') }),
  v.object({ phase: v.literal('awaitingConfirmation'), assessment: assessmentValidator }),
  v.object({ phase: v.literal('building'), assessment: assessmentValidator }),
  v.object({
    phase: v.literal('ready'),
    assessment: assessmentValidator,
    scoring: courseScoringValidator,
  }),
  v.object({
    phase: v.literal('failed'),
    failedDuring: v.literal('checking'),
    reason: failureReasonValidator,
    failedAt: v.number(),
  }),
  v.object({
    phase: v.literal('failed'),
    failedDuring: v.literal('building'),
    assessment: assessmentValidator,
    reason: failureReasonValidator,
    failedAt: v.number(),
  }),
);
export type ProposalState = Infer<typeof proposalStateValidator>;

export const runEventValidator = v.union(
  v.object({ type: v.literal('assessed'), assessment: assessmentValidator }),
  v.object({ type: v.literal('built'), scoring: courseScoringValidator }),
  v.object({ type: v.literal('failed'), reason: failureReasonValidator }),
);
export type RunEvent = Infer<typeof runEventValidator>;

export type OwnerEvent = { type: 'confirmed' } | { type: 'retryRequested' };

export type ProposalEvent = RunEvent | OwnerEvent;

export type Transition =
  | { kind: 'advanced'; next: ProposalState; startRun: boolean }
  | { kind: 'ignored' };

export const INITIAL_STATE: ProposalState = { phase: 'checking' };

export function isWorking(state: ProposalState): boolean {
  return state.phase === 'checking' || state.phase === 'building';
}

const IGNORED: Transition = { kind: 'ignored' };

export function advance({
  state,
  event,
  now,
}: {
  state: ProposalState;
  event: ProposalEvent;
  now: number;
}): Transition {
  switch (event.type) {
    case 'assessed':
      if (state.phase !== 'checking') return IGNORED;
      return event.assessment.warnings.length > 0
        ? {
            kind: 'advanced',
            next: { phase: 'awaitingConfirmation', assessment: event.assessment },
            startRun: false,
          }
        : {
            kind: 'advanced',
            next: { phase: 'building', assessment: event.assessment },
            startRun: true,
          };
    case 'confirmed':
      if (state.phase !== 'awaitingConfirmation') return IGNORED;
      return {
        kind: 'advanced',
        next: { phase: 'building', assessment: state.assessment },
        startRun: true,
      };
    case 'built':
      if (state.phase !== 'building') return IGNORED;
      return {
        kind: 'advanced',
        next: { phase: 'ready', assessment: state.assessment, scoring: event.scoring },
        startRun: false,
      };
    case 'failed':
      if (state.phase === 'checking') {
        return {
          kind: 'advanced',
          next: { phase: 'failed', failedDuring: 'checking', reason: event.reason, failedAt: now },
          startRun: false,
        };
      }
      if (state.phase === 'building') {
        return {
          kind: 'advanced',
          next: {
            phase: 'failed',
            failedDuring: 'building',
            assessment: state.assessment,
            reason: event.reason,
            failedAt: now,
          },
          startRun: false,
        };
      }
      return IGNORED;
    case 'retryRequested':
      if (state.phase !== 'failed' || now < retryableAt(state)) return IGNORED;
      return state.failedDuring === 'checking'
        ? { kind: 'advanced', next: { phase: 'checking' }, startRun: true }
        : {
            kind: 'advanced',
            next: { phase: 'building', assessment: state.assessment },
            startRun: true,
          };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function retryableAt(state: Extract<ProposalState, { phase: 'failed' }>): number {
  return state.failedAt + RETRY_COOLDOWN_MS;
}
