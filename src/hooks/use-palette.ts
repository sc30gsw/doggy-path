import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export function usePalette() {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
