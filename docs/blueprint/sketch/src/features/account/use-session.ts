/**
 * Where the Owner is in the app's lifecycle, as one value. The root stack's guards and
 * the Profile tab read this; nothing else checks auth or onboarding.
 */
import { useConvexAuth, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Owner } from '@/convex/domain/dogProfile';

export type Session =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'needsProfile' }
  | { kind: 'ready'; owner: Owner };

export function useSession(): Session {
  const auth = useConvexAuth();
  const owner = useQuery(api.owners.mine, auth.isAuthenticated ? {} : 'skip');
  if (auth.isLoading) return { kind: 'loading' };
  if (!auth.isAuthenticated) return { kind: 'signedOut' };
  if (owner === undefined) return { kind: 'loading' };
  if (owner === null) return { kind: 'needsProfile' };
  return { kind: 'ready', owner };
}
