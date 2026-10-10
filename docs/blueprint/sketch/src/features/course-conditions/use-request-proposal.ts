import { useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CourseConditions } from '@/convex/domain/courseConditions';

import { getDeviceLocation } from './device-location';

export function useRequestProposal(): (conditions: CourseConditions) => Promise<Id<'proposals'>> {
  const request = useMutation(api.proposals.request);
  return async (conditions) => {
    const deviceLocation = conditions.chosenStartPoint ? null : await getDeviceLocation();
    return request({ conditions, deviceLocation: deviceLocation ?? undefined });
  };
}
