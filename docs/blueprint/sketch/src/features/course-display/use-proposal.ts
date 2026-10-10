import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ShownCourses } from '@/convex/domain/proposalView';

export type ProposalScreen =
  | { phase: 'loading' }
  | { phase: 'none' }
  | { phase: 'working'; step: 'checking' | 'building' }
  | {
      phase: 'needsConfirmation';
      warnings: ConditionWarning[];
      proceed: () => Promise<null>;
    }
  | { phase: 'ready'; startPoint: ResolvedStartPoint; shown: ShownCourses }
  | { phase: 'failed'; reason: FailureReason; retry: () => Promise<null> };

export function useProposal(): ProposalScreen {
  const view = useQuery(api.proposals.current);
  const proceed = useMutation(api.proposals.proceed);
  const retry = useMutation(api.proposals.retry);

  if (view === undefined) return { phase: 'loading' };
  if (view === null) return { phase: 'none' };

  const { status } = view;
  switch (status.kind) {
    case 'working':
      return { phase: 'working', step: status.step };
    case 'needsConfirmation':
      return {
        phase: 'needsConfirmation',
        warnings: status.warnings,
        proceed: () => proceed({ proposalId: view.id }),
      };
    case 'ready':
      return { phase: 'ready', startPoint: view.startPoint, shown: status.shown };
    case 'failed':
      return {
        phase: 'failed',
        reason: status.reason,
        retry: () => retry({ proposalId: view.id }),
      };
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}
