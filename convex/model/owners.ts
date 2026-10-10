import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { findOwnerProblems, type Owner } from '../domain/dogProfile';

export async function findOwnerId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'> | null> {
  return getAuthUserId(ctx);
}

export async function requireOwnerId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'>> {
  const userId = await findOwnerId(ctx);
  if (userId === null) throw new ConvexError({ kind: 'signedOut' });
  return userId;
}

export async function loadOwner(
  ctx: QueryCtx,
  { userId }: { userId: Id<'users'> },
): Promise<Doc<'owners'> | null> {
  return ctx.db
    .query('owners')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
}

export async function saveOwner(
  ctx: MutationCtx,
  { userId, owner }: { userId: Id<'users'>; owner: Owner },
): Promise<void> {
  const problems = findOwnerProblems({ owner, now: new Date() });
  if (problems.length > 0) throw new ConvexError({ kind: 'invalidOwner', problems });
  const existing = await loadOwner(ctx, { userId });
  if (existing === null) {
    await ctx.db.insert('owners', { userId, ...owner });
  } else {
    await ctx.db.replace('owners', existing._id, { userId, ...owner });
  }
}
