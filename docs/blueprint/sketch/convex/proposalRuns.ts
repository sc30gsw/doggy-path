/**
 * The one internal action that does a proposal's external work. Thin orchestration:
 * load → (judge | build + judge) → record. It never writes the database directly.
 *
 * Runs are idempotent by construction: `loadRun` returns null for a stale attempt, and
 * `record` drops events whose attempt no longer matches. A run that crashes reports
 * `internal`; a run that hangs is caught by the watchdog `startRun` scheduled.
 *
 * Blueprint note: this body is real wiring on purpose. It is the type-checked call site
 * for `judge/` and `courseBuilder/`; all the logic it calls is still `not implemented`.
 */
import { v } from 'convex/values';

import { buildCourseCandidates } from './courseBuilder';
import type { RunEvent } from './domain/proposal';
import { targetLengthM } from './domain/walk';
import { judgeConditions, judgeCourseFits } from './judge';
import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

export const run = internalAction({
  args: { proposalId: v.id('proposals'), attempt: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const input = await ctx.runQuery(internal.proposals.loadRun, args);
    if (input === null) return null;

    const report = (event: RunEvent): Promise<null> =>
      ctx.runMutation(internal.proposals.record, { ...args, event });

    try {
      switch (input.phase) {
        case 'checking': {
          const assessment = await judgeConditions({
            dog: input.dog,
            conditions: input.conditions,
            now: new Date(),
          });
          return await report({ type: 'assessed', assessment });
        }
        case 'building': {
          const built = await buildCourseCandidates({
            start: input.startPoint.point,
            targetLengthM: targetLengthM(input.assessment.length, input.assessment.pace),
          });
          if (!built.ok) return await report({ type: 'failed', reason: built.reason });
          const scoring = await judgeCourseFits({
            dog: input.dog,
            conditions: input.conditions,
            assessment: input.assessment,
            courses: built.courses,
            now: new Date(),
          });
          return await report({ type: 'built', scoring });
        }
      }
    } catch (error) {
      console.error('proposal run failed', args, error);
      return await report({ type: 'failed', reason: 'internal' });
    }
  },
});
