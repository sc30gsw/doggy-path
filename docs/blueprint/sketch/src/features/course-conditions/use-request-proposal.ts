import { ConvexError } from 'convex/values';
import { useMutation } from 'convex/react';
import * as vb from 'valibot';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CourseConditions } from '@/convex/domain/courseConditions';

import { getDeviceLocation } from './device-location';

export type RequestOutcome =
  | { ok: true; proposalId: Id<'proposals'> }
  | { ok: false; refusal: 'dailyLimitReached' };

const dailyLimitReachedSchema = vb.object({ kind: vb.literal('dailyLimitReached') });

export function useRequestProposal(): (conditions: CourseConditions) => Promise<RequestOutcome> {
  const request = useMutation(api.proposals.request);
  return async (conditions) => {
    const deviceLocation = conditions.chosenStartPoint ? null : await getDeviceLocation();
    try {
      const proposalId = await request({ conditions, deviceLocation: deviceLocation ?? undefined });
      return { ok: true, proposalId };
    } catch (error) {
      if (error instanceof ConvexError && vb.is(dailyLimitReachedSchema, error.data)) {
        return { ok: false, refusal: 'dailyLimitReached' };
      }
      throw error;
    }
  };
}
