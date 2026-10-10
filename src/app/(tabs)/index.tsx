import { useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  return <View style={{ flex: 1, backgroundColor: palette.background }} />;
}
