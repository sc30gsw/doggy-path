/**
 * Proposals: the ONLY writer of the `proposals` table.
 *
 * Every state change goes through `commit(ctx, doc, transition)` with a transition from the
 * pure `advance` reducer (domain/proposal.ts). Runs (convex/proposalRuns.ts) never write
 * the table; they report events to `record`, fenced by `attempt`.
 *
 * Client usage (through `useProposal`, src/features/course-display/use-proposal.ts):
 *   const view = useQuery(api.proposals.current);                         // Home, live
 *   await request({ conditions, deviceLocation });                        // sheet submit
 *   await proceed({ proposalId: view.id });                               // 「このまま作る」
 *   await retry({ proposalId: view.id });                                 // error → retry
 * 「条件を直す」 needs no call: the sheet reopens prefilled from `current.conditions`, and
 * the next `request` becomes the Owner's current proposal.
 */
import { v } from 'convex/values';

import { requireOwnerId } from './auth';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { courseConditionsValidator, latLngValidator } from './domain/courseConditions';
import type { CourseConditions, ResolvedStartPoint } from './domain/courseConditions';
import type { DogProfile } from './domain/dogProfile';
import {
  advance,
  runEventValidator,
  type OwnerEvent,
  type Assessment,
  type Transition,
} from './domain/proposal';
import type { ProposalView } from './domain/proposalView';
import { RUN_TIMEOUT_MS } from './domain/tuning';

// ── Public ────────────────────────────────────────────────────────────────────────────

/**
 * The Owner's current proposal (their latest), as the client may see it, or null when
 * they have none yet. Home subscribes to this: no proposal id lives in client state, so
 * an app restart or a tab switch loses nothing. Ranking happens here, at read time.
 */
export const current = query({
  args: {},
  handler: async (ctx): Promise<ProposalView | null> => {
    const userId = await requireOwnerId(ctx);
    void userId;
    // TODO: latest = proposals.by_user(userId).order('desc').first();
    //       return latest === null ? null : toProposalView(latest).
    throw new Error('not implemented');
  },
});

/**
 * 「この条件で提案」. Validates limits, resolves the Start Point, snapshots the Dog Profile,
 * inserts the proposal in `checking` and starts the first run. Returns immediately; progress
 * is observed via `current`.
 *
 * Idempotent against double taps: while the Owner's latest proposal is still working
 * (checking / building), its id is returned and nothing new is scheduled, so a double tap
 * cannot spend ORS quota twice. Home hides 「コースを提案してもらう」 while working, so this
 * path only absorbs races, never a deliberate new request.
 *
 * `deviceLocation` is the client's best-effort current location, sent ONLY when the Owner
 * left Start Point empty. It is not part of `conditions`, so 「条件を直す」 shows the
 * sheet exactly as the Owner left it.
 */
export const request = mutation({
  args: {
    conditions: courseConditionsValidator,
    deviceLocation: v.optional(latLngValidator),
  },
  handler: async (ctx, args): Promise<Id<'proposals'>> => {
    void args;
    const userId = await requireOwnerId(ctx);
    void userId;
    // TODO:
    //   problems = findConditionProblems(args.conditions); non-empty → throw ConvexError({ problems }).
    //   owner = owners.by_user(userId).unique(); null → throw (onboarding gate bypassed).
    //   latest = proposals.by_user(userId).order('desc').first();
    //   if (latest && (latest.state.phase === 'checking' || latest.state.phase === 'building')) return latest._id;
    //   previous = first proposal by_user (desc) whose startPoint.source !== 'default', ?.startPoint.point
    //     (a Default Point is never "previous": the chain would fall through to it anyway).
    //   startPoint = resolveStartPoint({ chosen: args.conditions.startPoint, deviceLocation: args.deviceLocation, previous })
    //   id = insert({ userId, conditions, startPoint, dog: owner.dog, attempt: 1, state: INITIAL_TRANSITION.next })
    //   await startRun(ctx, id, 1)
    throw new Error('not implemented');
  },
});

/** 「このまま作る」: awaitingConfirmation → building, reusing the stored Assessment. Idempotent. */
export const proceed = mutation({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, args): Promise<null> => {
    await applyOwnerEvent(ctx, args.proposalId, { type: 'confirmed' });
    return null;
  },
});

/** Retry after a failure: resumes at the phase that failed, keeping any Assessment. Idempotent. */
export const retry = mutation({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, args): Promise<null> => {
    await applyOwnerEvent(ctx, args.proposalId, { type: 'retryRequested' });
    return null;
  },
});

// ── Internal: the run protocol ────────────────────────────────────────────────────────

/** What a run needs. The phase decides which work the run does. */
export type RunInput =
  | { phase: 'checking'; dog: DogProfile; conditions: CourseConditions }
  | {
      phase: 'building';
      dog: DogProfile;
      conditions: CourseConditions;
      startPoint: ResolvedStartPoint;
      assessment: Assessment;
    };

/** null = this run is stale (attempt moved on) or the phase has no work. The run then exits. */
export const loadRun = internalQuery({
  args: { proposalId: v.id('proposals'), attempt: v.number() },
  handler: async (ctx, args): Promise<RunInput | null> => {
    void ctx;
    void args;
    // TODO: doc.attempt !== args.attempt → null;
    //       phase checking/building → RunInput from doc.dog (the snapshot), doc.conditions, ...;
    //       any other phase → null.
    throw new Error('not implemented');
  },
});

/**
 * The single entry point for results. Also scheduled by `startRun` as the watchdog with
 * `{ type: 'failed', reason: 'timedOut' }`, which is a no-op if the run already reported
 * (phase moved on) or was superseded (attempt moved on).
 */
export const record = internalMutation({
  args: { proposalId: v.id('proposals'), attempt: v.number(), event: runEventValidator },
  handler: async (ctx, args): Promise<null> => {
    const doc = await ctx.db.get(args.proposalId);
    if (doc === null || doc.attempt !== args.attempt) return null; // stale run or watchdog
    const transition = advance(doc.state, args.event);
    if (transition !== null) await commit(ctx, doc, transition);
    return null;
  },
});

// ── Private helpers (real wiring: the protocol's call sites) ──────────────────────────

/**
 * Owner-originated events: only on the Owner's CURRENT (latest) proposal, phase-checked by
 * `advance`, not fenced. An older proposal is never restarted, so a stale screen cannot run
 * two pipelines at once.
 */
async function applyOwnerEvent(ctx: MutationCtx, proposalId: Id<'proposals'>, event: OwnerEvent) {
  const userId = await requireOwnerId(ctx);
  const latest = await ctx.db
    .query('proposals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .first();
  if (latest === null || latest._id !== proposalId) return; // superseded or foreign: no-op
  const doc = latest;
  const transition = advance(doc.state, event);
  if (transition !== null) await commit(ctx, doc, transition); // null = double tap: no-op
}

/** The only `db.patch` on proposals. */
async function commit(ctx: MutationCtx, doc: Doc<'proposals'>, transition: Transition) {
  const attempt = transition.startRun ? doc.attempt + 1 : doc.attempt;
  await ctx.db.patch(doc._id, { state: transition.next, attempt });
  if (transition.startRun) await startRun(ctx, doc._id, attempt);
}

/** Schedules the run and its watchdog for this attempt. */
async function startRun(ctx: MutationCtx, proposalId: Id<'proposals'>, attempt: number) {
  await ctx.scheduler.runAfter(0, internal.proposalRuns.run, { proposalId, attempt });
  await ctx.scheduler.runAfter(RUN_TIMEOUT_MS, internal.proposals.record, {
    proposalId,
    attempt,
    event: { type: 'failed', reason: 'timedOut' },
  });
}
