/**
 * The Course Conditions sheet's content. Rendered by `src/app/conditions.tsx`.
 *
 * Usage:
 *   <CourseConditionsForm initial={current?.conditions} onRequested={() => router.back()} />
 */
import type { CourseConditions } from '@/convex/domain/courseConditions';

export function CourseConditionsForm(props: {
  /** Present for 「条件を直す」. */
  initial?: CourseConditions;
  onRequested: () => void;
}): React.ReactElement {
  void props;
  // TODO: draft = initial ? draftFromConditions(initial) : EMPTY_CONDITIONS_DRAFT;
  //       <MoodChips>, Today's Memo (multiline), distance km + time min (both allowed),
  //       <StartPointField>; 「この条件で提案」 → parseConditionsDraft → errors inline, or
  //       await useRequestProposal()(value) → onRequested(). Disable the button while pending.
  throw new Error('not implemented');
}
