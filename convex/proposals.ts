import { v } from 'convex/values';

import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { courseConditionsValidator, latLngValidator } from './domain/courseConditions';
import { runEventValidator } from './domain/proposal';
import { proposalViewValidator, type ProposalView } from './domain/proposalView';
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

export const current = query({
  args: {},
  returns: v.union(proposalViewValidator, v.null()),
  handler: async (ctx): Promise<ProposalView | null> => {
    const userId = await requireOwnerId(ctx);
    return currentView(ctx, { userId });
  },
});

export const request = mutation({
  args: {
    conditions: courseConditionsValidator,
    deviceLocation: v.optional(latLngValidator),
  },
  returns: v.object({
    kind: v.union(v.literal('started'), v.literal('alreadyWorking')),
    proposalId: v.id('proposals'),
  }),
  handler: async (ctx, { conditions, deviceLocation }): Promise<RequestResult> => {
    const userId = await requireOwnerId(ctx);
    return requestProposal(ctx, { userId, conditions, deviceLocation });
  },
});

const ownerEvent = (type: 'confirmed' | 'retryRequested') =>
  mutation({
    args: { proposalId: v.id('proposals') },
    returns: v.null(),
    handler: async (ctx, { proposalId }): Promise<null> => {
      const userId = await requireOwnerId(ctx);
      await applyOwnerEventToLatest(ctx, { userId, proposalId, event: { type } });
      return null;
    },
  });

export const proceed = ownerEvent('confirmed');
export const retry = ownerEvent('retryRequested');

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
