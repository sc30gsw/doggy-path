import { ConvexError } from 'convex/values';

import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  findConditionProblems,
  resolveStartPoint,
  type CourseConditions,
  type LatLng,
  type ResolvedStartPoint,
} from '../domain/courseConditions';
import type { DogProfile } from '../domain/dogProfile';
import {
  INITIAL_TRANSITION,
  advance,
  isWorking,
  type Assessment,
  type OwnerEvent,
  type RunEvent,
  type Transition,
} from '../domain/proposal';
import { toProposalView, type ProposalView } from '../domain/proposalView';
import { PREVIOUS_START_POINT_LOOKBACK, RUN_TIMEOUT_MS } from '../domain/tuning';
import { loadOwner } from './owners';

export type RunInput =
  | { phase: 'checking'; dog: DogProfile; conditions: CourseConditions }
  | {
      phase: 'building';
      dog: DogProfile;
      conditions: CourseConditions;
      startPoint: ResolvedStartPoint;
      assessment: Assessment;
    };

export async function currentView(
  ctx: QueryCtx,
  { userId }: { userId: Id<'users'> },
): Promise<ProposalView | null> {
  const latest = await latestProposal(ctx, { userId });
  return latest === null ? null : toProposalView(latest);
}

/** While the Owner's latest proposal is working, returns its id and schedules nothing. */
export async function requestProposal(
  ctx: MutationCtx,
  {
    userId,
    conditions,
    deviceLocation,
  }: { userId: Id<'users'>; conditions: CourseConditions; deviceLocation: LatLng | undefined },
): Promise<Id<'proposals'>> {
  const problems = findConditionProblems(conditions);
  if (problems.length > 0) throw new ConvexError({ kind: 'invalidConditions', problems });
  const owner = await loadOwner(ctx, { userId });
  if (owner === null) throw new ConvexError({ kind: 'notOnboarded' });

  const latest = await latestProposal(ctx, { userId });
  if (latest !== null && isWorking(latest.state)) return latest._id;

  const startPoint = resolveStartPoint({
    chosen: conditions.chosenStartPoint,
    deviceLocation,
    previous: await previousStartPoint(ctx, { userId }),
  });
  const attempt = 1;
  const proposalId = await ctx.db.insert('proposals', {
    userId,
    conditions,
    startPoint,
    dogSnapshot: owner.dog,
    attempt,
    state: INITIAL_TRANSITION.next,
  });
  await startRun(ctx, { proposalId, attempt });
  return proposalId;
}

/** Acts only on the Owner's latest proposal, so a stale screen cannot restart an older one. */
export async function applyOwnerEvent(
  ctx: MutationCtx,
  { userId, proposalId, event }: { userId: Id<'users'>; proposalId: Id<'proposals'>; event: OwnerEvent },
): Promise<void> {
  const latest = await latestProposal(ctx, { userId });
  if (latest === null || latest._id !== proposalId) return;
  const transition = advance({ state: latest.state, event });
  if (transition !== null) await commit(ctx, { doc: latest, transition });
}

/** Events from a stale attempt (an old run, or a watchdog after the run reported) are dropped. */
export async function recordRunEvent(
  ctx: MutationCtx,
  { proposalId, attempt, event }: { proposalId: Id<'proposals'>; attempt: number; event: RunEvent },
): Promise<void> {
  const doc = await ctx.db.get('proposals', proposalId);
  if (doc === null || doc.attempt !== attempt) return;
  const transition = advance({ state: doc.state, event });
  if (transition !== null) await commit(ctx, { doc, transition });
}

export async function loadRunInput(
  ctx: QueryCtx,
  { proposalId, attempt }: { proposalId: Id<'proposals'>; attempt: number },
): Promise<RunInput | null> {
  const doc = await ctx.db.get('proposals', proposalId);
  if (doc === null || doc.attempt !== attempt) return null;
  const { state, dogSnapshot: dog, conditions, startPoint } = doc;
  switch (state.phase) {
    case 'checking':
      return { phase: 'checking', dog, conditions };
    case 'building':
      return { phase: 'building', dog, conditions, startPoint, assessment: state.assessment };
    case 'awaitingConfirmation':
    case 'ready':
    case 'failed':
      return null;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

async function latestProposal(
  ctx: QueryCtx,
  { userId }: { userId: Id<'users'> },
): Promise<Doc<'proposals'> | null> {
  return ctx.db
    .query('proposals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .first();
}

async function previousStartPoint(
  ctx: QueryCtx,
  { userId }: { userId: Id<'users'> },
): Promise<LatLng | undefined> {
  const recent = await ctx.db
    .query('proposals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(PREVIOUS_START_POINT_LOOKBACK);
  return recent.find((proposal) => proposal.startPoint.source !== 'default')?.startPoint.point;
}

async function commit(
  ctx: MutationCtx,
  { doc, transition }: { doc: Doc<'proposals'>; transition: Transition },
): Promise<void> {
  const attempt = transition.startRun ? doc.attempt + 1 : doc.attempt;
  await ctx.db.patch('proposals', doc._id, { state: transition.next, attempt });
  if (transition.startRun) await startRun(ctx, { proposalId: doc._id, attempt });
}

async function startRun(
  ctx: MutationCtx,
  { proposalId, attempt }: { proposalId: Id<'proposals'>; attempt: number },
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.proposalRuns.run, { proposalId, attempt });
  await ctx.scheduler.runAfter(RUN_TIMEOUT_MS, internal.proposals.record, {
    proposalId,
    attempt,
    event: { type: 'failed', reason: 'timedOut' },
  });
}
