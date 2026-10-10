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

/**
 * Produced only by `buildCourseCandidates`: `path` is a closed loop from the Start Point with
 * at most MAX_PATH_POINTS points; every share is a fraction of `distanceM` in [0, 1];
 * `surroundings` is null when Overpass was unavailable.
 */
export const courseValidator = v.object({
  key: v.string(),
  path: v.array(latLngValidator),
  distanceM: v.number(),
  ascentM: v.number(),
  unpavedShare: v.number(),
  surroundings: v.union(
    v.null(),
    v.object({ greenShare: v.number(), mainRoadShare: v.number() }),
  ),
});
export type Course = Infer<typeof courseValidator>;

export const MAX_PATH_POINTS = 300;

/**
 * Jev judgments of one course, each in [0, 1]: `body` and `mood` are Score positions toward the
 * best level, `mood` is null when the Owner gave no Mood, and `unsuitable` is a Noul probability.
 */
export const fitValidator = v.object({
  body: v.number(),
  mood: v.union(v.null(), v.number()),
  unsuitable: v.number(),
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

export type Transition = { next: ProposalState; startRun: boolean };

export const INITIAL_TRANSITION: Transition = { next: { phase: 'checking' }, startRun: true };

export function isWorking(state: ProposalState): boolean {
  return state.phase === 'checking' || state.phase === 'building';
}

/** `null` means the event does not apply in this state: callers treat it as a no-op. */
export function advance({
  state,
  event,
  now,
}: {
  state: ProposalState;
  event: ProposalEvent;
  now: number;
}): Transition | null {
  switch (event.type) {
    case 'assessed':
      if (state.phase !== 'checking') return null;
      return event.assessment.warnings.length > 0
        ? { next: { phase: 'awaitingConfirmation', assessment: event.assessment }, startRun: false }
        : { next: { phase: 'building', assessment: event.assessment }, startRun: true };
    case 'confirmed':
      if (state.phase !== 'awaitingConfirmation') return null;
      return { next: { phase: 'building', assessment: state.assessment }, startRun: true };
    case 'built':
      if (state.phase !== 'building') return null;
      return {
        next: { phase: 'ready', assessment: state.assessment, scoring: event.scoring },
        startRun: false,
      };
    case 'failed':
      if (state.phase === 'checking') {
        return {
          next: { phase: 'failed', failedDuring: 'checking', reason: event.reason, failedAt: now },
          startRun: false,
        };
      }
      if (state.phase === 'building') {
        return {
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
      return null;
    case 'retryRequested':
      if (state.phase !== 'failed' || now < retryableAt(state)) return null;
      return state.failedDuring === 'checking'
        ? { next: { phase: 'checking' }, startRun: true }
        : { next: { phase: 'building', assessment: state.assessment }, startRun: true };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function retryableAt(state: Extract<ProposalState, { phase: 'failed' }>): number {
  return state.failedAt + RETRY_COOLDOWN_MS;
}
