import type { SymbolViewProps } from 'expo-symbols';

import type { Mood } from '@/convex/domain/courseConditions';

const MOOD_CHIPS: Record<Mood, { label: string; symbol: SymbolViewProps['name'] }> = {
  relaxed: { label: 'のんびり', symbol: { ios: 'leaf', android: 'spa' } },
  energetic: { label: '元気いっぱい', symbol: { ios: 'bolt.fill', android: 'bolt' } },
  adventurous: { label: '冒険したい', symbol: { ios: 'map', android: 'explore' } },
  tired: { label: '疲れ気味', symbol: { ios: 'moon.zzz', android: 'bedtime' } },
  refresh: { label: '気分転換', symbol: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' } },
};

/** Single choice; tapping the selected chip clears it (Mood is optional). */
export function MoodChips(props: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}): React.ReactElement {
  void props;
  void MOOD_CHIPS;
  throw new Error('not implemented');
}
