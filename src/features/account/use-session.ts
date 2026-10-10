import { useConvexAuth, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Owner } from '@/convex/domain/dogProfile';

export type Session =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'needsProfile' }
  | { kind: 'ready'; owner: Owner };

function sessionStillLoading(
  authLoading: boolean,
  authenticated: boolean,
  owner: Owner | null | undefined,
): boolean {
  if (authLoading) return true;
  return authenticated && owner === undefined;
}

function sessionFrom(authenticated: boolean, owner: Owner | null | undefined): Session {
  if (!authenticated) return { kind: 'signedOut' };
  if (owner == null) return { kind: 'needsProfile' };
  return { kind: 'ready', owner };
}

export function useSession(): Session {
  const auth = useConvexAuth();
  const owner = useQuery(api.owners.mine, auth.isAuthenticated ? {} : 'skip');
  if (sessionStillLoading(auth.isLoading, auth.isAuthenticated, owner)) return { kind: 'loading' };
  return sessionFrom(auth.isAuthenticated, owner);
}
