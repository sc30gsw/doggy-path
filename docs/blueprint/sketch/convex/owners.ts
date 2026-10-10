/**
 * The Owner and their one Dog Profile. This file is the only writer of the `owners` table.
 *
 * Client usage:
 *   const owner = useQuery(api.owners.mine);              // undefined | null | Owner
 *   const save = useMutation(api.owners.save);
 *   await save({ owner: parsedForm });                     // onboarding AND Profile tab
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import { requireOwnerId } from './auth';
import { ownerValidator, type Owner } from './domain/dogProfile';

/**
 * The signed-in Owner, or null when onboarding is not done yet.
 * Returns null (not throws) when signed out, so the session gate can call it unconditionally.
 */
export const mine = query({
  args: {},
  handler: async (ctx): Promise<Owner | null> => {
    void getAuthUserId;
    void ctx;
    // TODO: userId = await getAuthUserId(ctx); null → null;
    //       row = owners.by_user(userId).unique(); row ? { ownerName: row.ownerName, dog: row.dog } : null.
    throw new Error('not implemented');
  },
});

/**
 * Create-or-replace (idempotent upsert). Same mutation for onboarding and later edits,
 * so "one Dog Profile per Owner" has exactly one enforcement point.
 */
export const save = mutation({
  args: { owner: ownerValidator },
  handler: async (ctx, args): Promise<null> => {
    void args;
    const userId = await requireOwnerId(ctx);
    void userId;
    // TODO: const problems = findOwnerProblems(args.owner, new Date());
    //       if (problems.length) throw new ConvexError({ problems });
    //       existing = owners.by_user(userId).unique();
    //       existing ? db.replace(existing._id, { userId, ...args.owner })
    //                : db.insert('owners', { userId, ...args.owner }).
    throw new Error('not implemented');
  },
});
