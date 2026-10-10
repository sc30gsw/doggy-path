import type { ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ShownCourses } from '@/convex/domain/proposalView';

export function WorkingView(props: { step: 'checking' | 'building' }): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

export function NeedsConfirmationView(props: {
  warnings: ConditionWarning[];
  onProceed: () => Promise<null>;
  onRevise: () => void;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

export function ReadyView(props: {
  startPoint: ResolvedStartPoint;
  shown: ShownCourses;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

export function FailedView(props: {
  reason: FailureReason;
  onRetry: () => Promise<null>;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}
