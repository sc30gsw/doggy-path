/**
 * One component per `ProposalScreen` phase. Home (`src/app/(tabs)/index.tsx`) switches on
 * `useProposal().phase` exhaustively and renders exactly one of these.
 */
import type { ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ShownCourses } from '@/convex/domain/proposalView';

/** Spinner + WORKING_LABELS[step]. */
export function WorkingView(props: { step: 'checking' | 'building' }): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

/**
 * The Condition Check warning (WARNING_LABELS). Never blocks:
 *   「このまま作る」 → onProceed()   (status → working; the stored Assessment is reused)
 *   「条件を直す」   → onRevise()    (the sheet reopens prefilled; the next request replaces this one)
 */
export function NeedsConfirmationView(props: {
  warnings: ConditionWarning[];
  onProceed: () => Promise<null>;
  onRevise: () => void;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

/**
 * Map + candidate switcher. Selection is local UI state (a course `key`), defaulting to
 * the first. Each switcher item: distance (km), estimatedMinutes, and REASON_LABELS[reason]
 * when `order === 'recommended'`; BY_LENGTH_NOTICE above the list when `byLength`;
 * START_POINT_NOTES[startPoint.source] under the map.
 */
export function ReadyView(props: {
  startPoint: ResolvedStartPoint;
  shown: ShownCourses;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

/** FAILURE_LABELS[reason] + 「もう一度試す」 → onRetry(). */
export function FailedView(props: {
  reason: FailureReason;
  onRetry: () => Promise<null>;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}
