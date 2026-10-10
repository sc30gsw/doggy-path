import { v } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import {
  courseConditionsValidator,
  latLngValidator,
  resolvedStartPointValidator,
  type CourseConditions,
  type LatLng,
  type ResolvedStartPoint,
} from './courseConditions';
import {
  conditionWarningValidator,
  failureReasonValidator,
  retryableAt,
  type ConditionWarning,
  type Course,
  type FailureReason,
} from './proposal';
import { rankCourses, type FitKind } from './ranking';
import { estimateMinutes, targetLengthM, type WalkingPace } from './walk';

export type ShownCourse = {
  key: string;
  path: LatLng[];
  distanceM: number;
  estimatedMinutes: number;
};

export type ShownCourses =
  | {
      order: 'recommended';
      bestFirst: Array<ShownCourse & { reason: FitKind; unsuitable: boolean }>;
      allUnsuitable: boolean;
    }
  | { order: 'byLength'; bestFirst: ShownCourse[] };

export type ProposalStatus =
  | { kind: 'working'; step: 'checking' | 'building' }
  | { kind: 'needsConfirmation'; warnings: ConditionWarning[] }
  | { kind: 'ready'; shown: ShownCourses }
  | { kind: 'failed'; reason: FailureReason; retryableAt: number };

const shownCourseValidator = v.object({
  key: v.string(),
  path: v.array(latLngValidator),
  distanceM: v.number(),
  estimatedMinutes: v.number(),
});

const recommendedCourseValidator = v.object({
  key: v.string(),
  path: v.array(latLngValidator),
  distanceM: v.number(),
  estimatedMinutes: v.number(),
  reason: v.union(v.literal('body'), v.literal('mood')),
  unsuitable: v.boolean(),
});

export const proposalViewValidator = v.object({
  id: v.id('proposals'),
  dogName: v.string(),
  conditions: courseConditionsValidator,
  startPoint: resolvedStartPointValidator,
  status: v.union(
    v.object({
      kind: v.literal('working'),
      step: v.union(v.literal('checking'), v.literal('building')),
    }),
    v.object({
      kind: v.literal('needsConfirmation'),
      warnings: v.array(conditionWarningValidator),
    }),
    v.object({
      kind: v.literal('ready'),
      shown: v.union(
        v.object({
          order: v.literal('recommended'),
          bestFirst: v.array(recommendedCourseValidator),
          allUnsuitable: v.boolean(),
        }),
        v.object({ order: v.literal('byLength'), bestFirst: v.array(shownCourseValidator) }),
      ),
    }),
    v.object({
      kind: v.literal('failed'),
      reason: failureReasonValidator,
      retryableAt: v.number(),
    }),
  ),
});

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

function toShownCourses(
  state: Extract<Doc<'proposals'>['state'], { phase: 'ready' }>,
): ShownCourses {
  const { pace, length } = state.assessment;
  const ranked = rankCourses({
    scoring: state.scoring,
    targetLengthM: targetLengthM({ length, pace }),
  });
  switch (ranked.order) {
    case 'recommended':
      return {
        order: 'recommended',
        bestFirst: ranked.courses.map(({ course, reason, unsuitable }) => ({
          ...toShownCourse({ course, pace }),
          reason,
          unsuitable,
        })),
        allUnsuitable: ranked.courses.every(({ unsuitable }) => unsuitable),
      };
    case 'byLength':
      return {
        order: 'byLength',
        bestFirst: ranked.courses.map((course) => toShownCourse({ course, pace })),
      };
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
