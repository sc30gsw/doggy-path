/**
 * Convex schema. Every field validator comes from `convex/domain/*` (ADR 0002): this
 * file only decides tables, ownership columns and indexes.
 */
import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { courseConditionsValidator, resolvedStartPointValidator } from './domain/courseConditions';
import { dogProfileValidator, ownerFields } from './domain/dogProfile';
import { proposalStateValidator } from './domain/proposal';

export default defineSchema({
  ...authTables,

  /**
   * One per Owner, written ONLY by `owners.save` (an upsert through `by_user`).
   * Exists ⇔ onboarded. The Dog Profile is embedded: one dog per Owner by structure.
   */
  owners: defineTable({
    userId: v.id('users'),
    ...ownerFields,
  }).index('by_user', ['userId']),

  /**
   * One per "この条件で提案" tap. Written ONLY by `convex/proposals.ts`.
   * The latest non-default Start Point per Owner is the "previous Start Point"
   * (derived, not stored elsewhere).
   */
  proposals: defineTable({
    /** The Convex Auth user id, like `owners.userId`. */
    userId: v.id('users'),
    conditions: courseConditionsValidator,
    startPoint: resolvedStartPointValidator,
    /**
     * The Dog Profile as it was when the Owner tapped. Runs, confirm and retry all judge
     * this snapshot, so editing the profile mid-build cannot mix two dogs into one result.
     */
    dog: dogProfileValidator,
    /** Fencing token. Bumped each time a run is scheduled; stale runs' events are dropped. */
    attempt: v.number(),
    state: proposalStateValidator,
  }).index('by_user', ['userId']),
});
