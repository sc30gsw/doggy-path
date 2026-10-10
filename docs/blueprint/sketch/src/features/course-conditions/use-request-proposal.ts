/**
 * The one way to start a proposal from the client.
 *
 *   const requestProposal = useRequestProposal();
 *   await requestProposal(conditions);   // Home's `useProposal` then shows it
 *
 * Adds the device location ONLY when the Owner left Start Point empty: that is the
 * client's share of the fallback chain (`resolveStartPoint` on the server does the rest).
 */
import { useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CourseConditions } from '@/convex/domain/courseConditions';

import { getDeviceLocation } from './device-location';

export function useRequestProposal(): (conditions: CourseConditions) => Promise<Id<'proposals'>> {
  const request = useMutation(api.proposals.request);
  return async (conditions) => {
    const deviceLocation = conditions.startPoint ? null : await getDeviceLocation();
    return request({ conditions, deviceLocation: deviceLocation ?? undefined });
  };
}
