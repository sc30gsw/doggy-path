import { Button, Host } from '@expo/ui';
import { router } from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Host matchContents>
        <Button label="コースを提案してもらう" onPress={() => router.push('/conditions')} />
      </Host>
    </View>
  );
}
