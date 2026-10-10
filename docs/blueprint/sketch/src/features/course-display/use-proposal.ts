/**
 * The Owner's current proposal as one union for Home. Each phase carries only the actions
 * that are valid in it: `proceed` exists only while a Condition Check warning waits, and
 * `retry` only after a failure, so calling either at the wrong time is a compile error.
 *
 *   const screen = useProposal();
 *   switch (screen.phase) { ... }   // exhaustive; see src/app/(tabs)/index.tsx
 */
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { CourseConditions, ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ShownCourses } from '@/convex/domain/proposalView';

export type ProposalScreen =
  | { phase: 'loading' }
  /** No proposal yet: Home shows only 「コースを提案してもらう」. */
  | { phase: 'none' }
  | { phase: 'working'; step: 'checking' | 'building' }
  | {
      phase: 'needsConfirmation';
      warnings: ConditionWarning[];
      /** For 「条件を直す」: the sheet reopens prefilled with these. */
      conditions: CourseConditions;
      /** 「このまま作る」. */
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
        conditions: view.conditions,
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
