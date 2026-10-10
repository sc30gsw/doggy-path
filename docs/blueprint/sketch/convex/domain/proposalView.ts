import type { Doc, Id } from '../_generated/dataModel';
import type { CourseConditions, LatLng, ResolvedStartPoint } from './courseConditions';
import { retryableAt, type ConditionWarning, type Course, type FailureReason } from './proposal';
import { rankCourses, type FitKind } from './ranking';
import { estimateMinutes, targetLengthM, type WalkingPace } from './walk';

export type ShownCourse = {
  key: string;
  path: LatLng[];
  distanceM: number;
  estimatedMinutes: number;
};

/** At most SHOWN_COURSE_COUNT courses, best first, never empty. */
export type ShownCourses =
  | {
      order: 'recommended';
      courses: Array<ShownCourse & { reason: FitKind; unsuitable: boolean }>;
      allUnsuitable: boolean;
    }
  | { order: 'byLength'; courses: ShownCourse[] };

export type ProposalStatus =
  | { kind: 'working'; step: 'checking' | 'building' }
  | { kind: 'needsConfirmation'; warnings: ConditionWarning[] }
  | { kind: 'ready'; shown: ShownCourses }
  | { kind: 'failed'; reason: FailureReason; retryableAt: number };

export type ProposalView = {
  id: Id<'proposals'>;
  dogName: string;
  conditions: CourseConditions;
  startPoint: ResolvedStartPoint;
  status: ProposalStatus;
};

export function toProposalView(doc: Doc<'proposals'>): ProposalView {
  return {
    id: doc._id,
    dogName: doc.dogSnapshot.dogName,
    conditions: doc.conditions,
    startPoint: doc.startPoint,
    status: toStatus(doc.state),
  };
}

function toStatus(state: Doc<'proposals'>['state']): ProposalStatus {
  switch (state.phase) {
    case 'checking':
    case 'building':
      return { kind: 'working', step: state.phase };
    case 'awaitingConfirmation':
      return { kind: 'needsConfirmation', warnings: state.assessment.warnings };
    case 'ready':
      return { kind: 'ready', shown: toShownCourses(state) };
    case 'failed':
      return { kind: 'failed', reason: state.reason, retryableAt: retryableAt(state) };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function toShownCourses(state: Extract<Doc<'proposals'>['state'], { phase: 'ready' }>): ShownCourses {
  const { pace, length } = state.assessment;
  const ranked = rankCourses({
    scoring: state.scoring,
    targetLengthM: targetLengthM({ length, pace }),
  });
  switch (ranked.order) {
    case 'recommended':
      return {
        order: 'recommended',
        courses: ranked.courses.map(({ course, reason, unsuitable }) => ({
          ...toShownCourse({ course, pace }),
          reason,
          unsuitable,
        })),
        allUnsuitable: ranked.courses.every(({ unsuitable }) => unsuitable),
      };
    case 'byLength':
      return { order: 'byLength', courses: ranked.courses.map((course) => toShownCourse({ course, pace })) };
    default: {
      const _exhaustive: never = ranked;
      return _exhaustive;
    }
  }
}

function toShownCourse({ course, pace }: { course: Course; pace: WalkingPace }): ShownCourse {
  return {
    key: course.key,
    path: course.path,
    distanceM: course.distanceM,
    estimatedMinutes: estimateMinutes({ distanceM: course.distanceM, pace }),
  };
}
