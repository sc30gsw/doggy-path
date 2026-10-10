/** Shown only while signed in without a Dog Profile (RootStack guard). Required fields gate the app. */
import { DogProfileForm } from '@/features/dog-profile/dog-profile-form';

export default function OnboardingScreen() {
  return <DogProfileForm submitLabel="はじめる" />;
}
