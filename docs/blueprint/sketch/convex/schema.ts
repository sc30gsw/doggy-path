import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { courseConditionsValidator, resolvedStartPointValidator } from './domain/courseConditions';
import { dogProfileValidator, ownerFields } from './domain/dogProfile';
import { proposalStateValidator } from './domain/proposal';

export default defineSchema({
  ...authTables,

  owners: defineTable({
    userId: v.id('users'),
    ...ownerFields,
  }).index('by_user', ['userId']),

  proposals: defineTable({
    userId: v.id('users'),
    conditions: courseConditionsValidator,
    startPoint: resolvedStartPointValidator,
    dogSnapshot: dogProfileValidator,
    attempt: v.number(),
    state: proposalStateValidator,
  }).index('by_user', ['userId']),
});
