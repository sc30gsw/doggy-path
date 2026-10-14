import { useAuthActions } from '@convex-dev/auth/react';
import { FieldGroup } from '@expo/ui';
import { SafeAreaView } from 'react-native-screens/experimental';

import { CenteredButton } from '@/components/form-rows';
import { useSession } from '@/features/account/use-session';
import { DogProfileForm } from '@/features/dog-profile/dog-profile-form';

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuthActions();
  if (session.kind !== 'ready') return null;
  // NativeTabs insets only a React Native ScrollView; this form is a SwiftUI list, so without the
  // bottom edge its last group stays under the floating tab bar.
  return (
    <SafeAreaView edges={{ bottom: true }} style={{ flex: 1 }}>
      <DogProfileForm initial={session.owner} submitLabel="保存する">
        <FieldGroup.Section>
          <CenteredButton variant="text" label="サインアウト" onPress={() => void signOut()} />
        </FieldGroup.Section>
      </DogProfileForm>
    </SafeAreaView>
  );
}
