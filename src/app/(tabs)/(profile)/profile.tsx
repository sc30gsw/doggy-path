import { useAuthActions } from '@convex-dev/auth/react';
import { FieldGroup } from '@expo/ui';

import { CenteredButton } from '@/components/form-rows';
import { useSession } from '@/features/account/use-session';
import { DogProfileForm } from '@/features/dog-profile/dog-profile-form';

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuthActions();
  if (session.kind !== 'ready') return null;
  return (
    <DogProfileForm initial={session.owner} submitLabel="保存する">
      <FieldGroup.Section>
        <CenteredButton variant="text" label="サインアウト" onPress={() => void signOut()} />
      </FieldGroup.Section>
    </DogProfileForm>
  );
}
