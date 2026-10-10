import { mutation, query } from './_generated/server';
import { ownerValidator, type Owner } from './domain/dogProfile';
import { findOwnerId, loadOwner, requireOwnerId, saveOwner } from './model/owners';

/** null when signed out or before onboarding, so the session gate can call it unconditionally. */
export const mine = query({
  args: {},
  handler: async (ctx): Promise<Owner | null> => {
    const userId = await findOwnerId(ctx);
    if (userId === null) return null;
    const row = await loadOwner(ctx, { userId });
    return row === null ? null : { ownerName: row.ownerName, dog: row.dog };
  },
});

/** Create-or-replace. */
export const save = mutation({
  args: { owner: ownerValidator },
  handler: async (ctx, { owner }): Promise<null> => {
    const userId = await requireOwnerId(ctx);
    await saveOwner(ctx, { userId, owner });
    return null;
  },
});
