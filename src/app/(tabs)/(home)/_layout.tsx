import Stack from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'ホーム' }} />
    </Stack>
  );
}
