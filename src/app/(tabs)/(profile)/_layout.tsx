import Stack from 'expo-router/stack';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
    </Stack>
  );
}
