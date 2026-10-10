/**
 * Mood chips: order and labels come from `MOODS` (convex/domain/courseConditions.ts);
 * icons come from `MOOD_SYMBOLS` below. `MOOD_SYMBOLS` is a `Record<Mood, …>`, so adding a
 * Mood to the catalog fails this file's typecheck until it gets an icon.
 *
 * Custom chips because `@expo/ui` Picker items cannot hold icons.
 */
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
  // TODO: MOODS.map(({ id, ja }) => <Pressable accessibilityRole="radio" accessibilityState={{ selected }}>
  //         <SymbolView name={MOOD_SYMBOLS[id]} /> <ThemedText>{ja}</ThemedText></Pressable>), wrapping row.
  throw new Error('not implemented');
}
