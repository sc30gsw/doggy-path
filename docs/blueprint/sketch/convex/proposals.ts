import { v } from 'convex/values';

import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { courseConditionsValidator, latLngValidator } from './domain/courseConditions';
import { runEventValidator } from './domain/proposal';
import type { ProposalView } from './domain/proposalView';
import { requireOwnerId } from './model/owners';
import {
  applyOwnerEventToLatest,
  currentView,
  loadRunInput,
  recordRunEvent,
  requestProposal,
  type RequestResult,
  type RunInput,
} from './model/proposals';

/** The Owner's latest proposal, or null when they have none yet. */
export const current = query({
  args: {},
  handler: async (ctx): Promise<ProposalView | null> => {
    const userId = await requireOwnerId(ctx);
    return currentView(ctx, { userId });
  },
});

/** `deviceLocation` is sent only when the Owner left the Start Point empty. */
export const request = mutation({
  args: {
    conditions: courseConditionsValidator,
    deviceLocation: v.optional(latLngValidator),
  },
  handler: async (ctx, { conditions, deviceLocation }): Promise<RequestResult> => {
    const userId = await requireOwnerId(ctx);
    return requestProposal(ctx, { userId, conditions, deviceLocation });
  },
});

/** 「このまま作る」. */
export const proceed = mutation({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, { proposalId }): Promise<null> => {
    const userId = await requireOwnerId(ctx);
    await applyOwnerEventToLatest(ctx, { userId, proposalId, event: { type: 'confirmed' } });
    return null;
  },
});

export const retry = mutation({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, { proposalId }): Promise<null> => {
    const userId = await requireOwnerId(ctx);
    await applyOwnerEventToLatest(ctx, { userId, proposalId, event: { type: 'retryRequested' } });
    return null;
  },
});

export const loadRun = internalQuery({
  args: { proposalId: v.id('proposals'), attempt: v.number() },
  handler: async (ctx, args): Promise<RunInput | null> => loadRunInput(ctx, args),
});

export const record = internalMutation({
  args: { proposalId: v.id('proposals'), attempt: v.number(), event: runEventValidator },
  handler: async (ctx, args): Promise<null> => {
    await recordRunEvent(ctx, args);
    return null;
  },
});
