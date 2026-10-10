import { useAuthActions } from '@convex-dev/auth/react';
import { Button, Host } from '@expo/ui';

import { useSession } from '@/features/account/use-session';
import { DogProfileForm } from '@/features/dog-profile/dog-profile-form';

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuthActions();
  if (session.kind !== 'ready') return null;
  return (
    <>
      <DogProfileForm initial={session.owner} submitLabel="保存する" />
      <Host matchContents>
        <Button label="サインアウト" onPress={() => void signOut()} />
      </Host>
    </>
  );
}
