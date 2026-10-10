/**
 * Convex Auth with email + password only (ADR 0003). No verification, no reset.
 * `requireOwnerId` is the one way a function learns who the Owner is.
 */
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server';

import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

/** Throws when signed out. Every public query/mutation that touches Owner data calls this first. */
export async function requireOwnerId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'>> {
  const ownerId = await getAuthUserId(ctx);
  if (ownerId === null) throw new Error('Not signed in');
  return ownerId;
}
