/**
 * The ONLY proposal shape the client sees: `proposals.current` returns `ProposalView`.
 *
 * The client never sees `ProposalState`, attempts, Fit numbers, weights, how many
 * courses were built, or whether a run is checking vs. building beyond a progress step.
 * Everything here is derived at read time from the stored document.
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { CourseConditions, LatLng, ResolvedStartPoint } from './courseConditions';
import type { ConditionWarning, FailureReason } from './proposal';
import type { FitKind } from './ranking';

export type ShownCourse = {
  key: string;
  path: LatLng[];
  distanceM: number;
  estimatedMinutes: number;
};

/**
 * At most SHOWN_COURSE_COUNT courses, best first, never empty.
 * `byLength` = Jev was unavailable; the UI shows 「おすすめ順ではありません」 and no reasons.
 */
export type ShownCourses =
  | { order: 'recommended'; courses: Array<ShownCourse & { reason: FitKind }> }
  | { order: 'byLength'; courses: ShownCourse[] };

export type ProposalStatus =
  | { kind: 'working'; step: 'checking' | 'building' }
  | { kind: 'needsConfirmation'; warnings: ConditionWarning[] }
  | { kind: 'ready'; shown: ShownCourses }
  | { kind: 'failed'; reason: FailureReason };

export type ProposalView = {
  id: Id<'proposals'>;
  /** As the Owner entered them; used to prefill the sheet for 「条件を直す」. */
  conditions: CourseConditions;
  startPoint: ResolvedStartPoint;
  status: ProposalStatus;
};

/**
 * Pure projection. `ready` → `rankCourses(scoring, targetLengthM(assessment.length, assessment.pace))`
 * then `estimateMinutes(distanceM, assessment.pace)` per course.
 */
export function toProposalView(doc: Doc<'proposals'>): ProposalView {
  void doc;
  // TODO: exhaustive switch on doc.state.phase:
  //   checking → working/checking; building → working/building;
  //   awaitingConfirmation → needsConfirmation(assessment.warnings);
  //   ready → ranked + estimated (see above); failed → failed(reason).
  throw new Error('not implemented');
}
