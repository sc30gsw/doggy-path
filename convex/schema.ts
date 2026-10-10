import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { ownerFields } from './domain/dogProfile';

export default defineSchema({
  ...authTables,

  owners: defineTable({
    userId: v.id('users'),
    ...ownerFields,
  }).index('by_user', ['userId']),
});
