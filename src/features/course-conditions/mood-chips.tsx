import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { MOOD_IDS, type Mood } from '@/convex/domain/courseConditions';

const MOOD_CHIPS: Record<Mood, { label: string; symbol: SymbolViewProps['name'] }> = {
  relaxed: { label: 'のんびり', symbol: { ios: 'leaf', android: 'spa' } },
  energetic: { label: '元気いっぱい', symbol: { ios: 'bolt.fill', android: 'bolt' } },
  adventurous: { label: '冒険したい', symbol: { ios: 'map', android: 'explore' } },
  tired: { label: '疲れ気味', symbol: { ios: 'moon.zzz', android: 'bedtime' } },
  refresh: {
    label: '気分転換',
    symbol: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
  },
};

export function MoodChips(props: { value: Mood | null; onChange: (mood: Mood | null) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {MOOD_IDS.map((id) => (
        <MoodChip
          key={id}
          id={id}
          selected={props.value === id}
          onPress={() => props.onChange(props.value === id ? null : id)}
        />
      ))}
    </View>
  );
}

function MoodChip(props: { id: Mood; selected: boolean; onPress: () => void }) {
  const chip = MOOD_CHIPS[props.id];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
      onPress={props.onPress}
    >
      <SymbolView name={chip.symbol} size={20} />
      <Text>{chip.label}</Text>
    </Pressable>
  );
}
