/**
 * Convex Auth with email + password only (ADR 0003). No verification, no reset.
 * `findOwnerId` / `requireOwnerId` are the only ways a function learns who the Owner is.
 * The id is the Convex Auth `users` id; tables store it as `userId`.
 */
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server';

import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

/** null when signed out. For queries the session gate calls before sign-in completes. */
export async function findOwnerId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'> | null> {
  return getAuthUserId(ctx);
}

/** Throws when signed out. Every public mutation and query that needs an Owner calls this first. */
export async function requireOwnerId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'>> {
  const ownerId = await findOwnerId(ctx);
  if (ownerId === null) throw new Error('Not signed in');
  return ownerId;
}
