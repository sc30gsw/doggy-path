/**
 * The proposal lifecycle as ONE state machine.
 *
 *   request ─► checking ─assessed, no warnings──────────────────► building ─built─► ready
 *              checking ─assessed, warnings─► awaitingConfirmation ─confirmed (このまま作る)─► building
 *              checking ─failed─► failed(checking) ─retryRequested─► checking
 *              building ─failed─► failed(building) ─retryRequested─► building
 *   (「条件を直す」 is not a transition: it opens a new sheet and makes a NEW proposal.)
 *
 * - The phase IS the job description: a scheduled run looks at the phase to know whether
 *   to assess or to build. There is no separate "job kind" to keep in sync.
 * - Every result a run produces is stored in the state that needs it, so resuming
 *   (confirm, retry) never redoes finished work: `building` and `failed(building)` carry
 *   the Assessment; only `failed(checking)` re-runs Jev.
 * - `advance` is pure and total. Events that do not apply to the current phase return
 *   `null`, which callers treat as an idempotent no-op (double taps, late runs, watchdogs).
 *
 * Shared with the client only through `ProposalView` (see ./proposalView.ts); the client
 * never sees or switches on `ProposalState`.
 */
import { v, type Infer } from 'convex/values';

import { latLngValidator } from './courseConditions';
import { lengthDecisionValidator, walkingPaceValidator } from './walk';

// ── Assessment: the result of the Condition Check request ─────────────────────────────

export const conditionWarningValidator = v.union(
  v.literal('targetsInconsistent'), // Target Distance and Target Time disagree
  v.literal('tooMuchLoad'), // too much for this dog today
);
export type ConditionWarning = Infer<typeof conditionWarningValidator>;

/**
 * Everything the first Jev request decides, in one value. Never fails to exist:
 * if Jev is unavailable the judge falls back (`judgedBy: 'fallback'`, no warnings,
 * pace normal, length class normal) because the Condition Check must never block.
 */
export const assessmentValidator = v.object({
  pace: walkingPaceValidator,
  length: lengthDecisionValidator,
  warnings: v.array(conditionWarningValidator),
  judgedBy: v.union(v.literal('jev'), v.literal('fallback')),
});
export type Assessment = Infer<typeof assessmentValidator>;

// ── Courses and their Fit ─────────────────────────────────────────────────────────────

/**
 * A built Course Candidate, already reduced to routing-provider-neutral facts (ADR 0004).
 * Invariants (enforced by courseBuilder, the only producer):
 * - `path` is a closed loop starting at the Start Point, simplified to ≤ MAX_PATH_POINTS.
 * - shares are fractions of `distanceM` in [0, 1].
 * - `surroundings` is null when Overpass was unavailable; the course is still usable.
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

/** Bounds the stored document size: 5 courses × 300 points stays far below Convex limits. */
export const MAX_PATH_POINTS = 300;

/** Jev Score positions in [0, 1]. `mood` is null when the Owner gave no Mood. */
export const fitValidator = v.object({ body: v.number(), mood: v.union(v.null(), v.number()) });
export type Fit = Infer<typeof fitValidator>;

/**
 * What scoring produced. Either every course has a Fit, or none does (Jev failed):
 * the union makes "some scored, some not" unrepresentable. Ranking happens at READ
 * time from this (./ranking.ts), so changing weights never re-runs Jev.
 */
export const courseScoringValidator = v.union(
  v.object({
    kind: v.literal('byFit'),
    scored: v.array(v.object({ course: courseValidator, fit: fitValidator })),
  }),
  v.object({ kind: v.literal('byLength'), courses: v.array(courseValidator) }),
);
export type CourseScoring = Infer<typeof courseScoringValidator>;

// ── State ─────────────────────────────────────────────────────────────────────────────

export const failureReasonValidator = v.union(
  v.literal('routingUnavailable'), // ORS down, quota, or rate limit → "retry later"
  v.literal('noLoopFound'), // ORS answered but no usable loop near this Start Point
  v.literal('timedOut'), // the watchdog fired before the run reported back
  v.literal('internal'), // unexpected exception inside a run
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
  }),
  v.object({
    phase: v.literal('failed'),
    failedDuring: v.literal('building'),
    assessment: assessmentValidator,
    reason: failureReasonValidator,
  }),
);
export type ProposalState = Infer<typeof proposalStateValidator>;

// ── Events and transitions ────────────────────────────────────────────────────────────

/** Events reported by a run. Fenced by `attempt` in `proposals.record`. */
export const runEventValidator = v.union(
  v.object({ type: v.literal('assessed'), assessment: assessmentValidator }),
  v.object({ type: v.literal('built'), scoring: courseScoringValidator }),
  v.object({ type: v.literal('failed'), reason: failureReasonValidator }),
);
export type RunEvent = Infer<typeof runEventValidator>;

/** Events from the Owner, through public mutations. Not fenced; phase-checked by `advance`. */
export type OwnerEvent = { type: 'confirmed' } | { type: 'retryRequested' };

export type ProposalEvent = RunEvent | OwnerEvent;

/**
 * A legal transition. `startRun: true` means: bump `attempt`, schedule the run for the
 * new phase, and schedule its watchdog. Only `checking` and `building` start runs.
 */
export type Transition = { next: ProposalState; startRun: boolean };

/** How a brand-new proposal starts. */
export const INITIAL_TRANSITION: Transition = { next: { phase: 'checking' }, startRun: true };

/**
 * The whole lifecycle. Pure and total; `null` = this event does not apply now (no-op).
 */
export function advance(state: ProposalState, event: ProposalEvent): Transition | null {
  void state;
  void event;
  // TODO: exhaustive switch on event.type, then on state.phase:
  //   assessed       @ checking             → warnings.length ? awaitingConfirmation : building(startRun)
  //   confirmed      @ awaitingConfirmation → building(startRun) with the stored assessment
  //   built          @ building             → ready
  //   failed(reason) @ checking             → failed(checking)
  //   failed(reason) @ building             → failed(building, assessment)
  //   retryRequested @ failed(checking)     → checking(startRun)
  //   retryRequested @ failed(building)     → building(startRun) with the stored assessment
  //   anything else                         → null
  // End each switch with `const _exhaustive: never = …` so a new phase/event fails the build.
  throw new Error('not implemented');
}
