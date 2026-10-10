import type { SymbolViewProps } from 'expo-symbols';

import type { Mood } from '@/convex/domain/courseConditions';

const MOOD_SYMBOLS: Record<Mood, SymbolViewProps['name']> = {
  relaxed: { ios: 'leaf', android: 'spa' },
  energetic: { ios: 'bolt.fill', android: 'bolt' },
  adventurous: { ios: 'map', android: 'explore' },
  tired: { ios: 'moon.zzz', android: 'bedtime' },
  refresh: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
};

/** Single choice; tapping the selected chip clears it (Mood is optional). */
export function MoodChips(props: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}): React.ReactElement {
  void props;
  void MOOD_SYMBOLS;
  throw new Error('not implemented');
}
