import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, Text } from 'react-native';

import { MOOD_IDS, type Mood } from '@/convex/domain/courseConditions';
import { usePalette } from '@/hooks/use-palette';

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

export const MOOD_CHIPS_HEIGHT = 48;

export function MoodChips(props: { value: Mood | null; onChange: (mood: Mood | null) => void }) {
  return (
    <FlatList
      horizontal
      data={MOOD_IDS}
      keyExtractor={(id) => id}
      extraData={props.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ alignItems: 'center', gap: 8 }}
      renderItem={({ item: id }) => (
        <MoodChip
          id={id}
          selected={props.value === id}
          onPress={() => props.onChange(props.value === id ? null : id)}
        />
      )}
    />
  );
}

function MoodChip(props: { id: Mood; selected: boolean; onPress: () => void }) {
  const chip = MOOD_CHIPS[props.id];
  const palette = usePalette();
  const foreground = props.selected ? '#FFFFFF' : palette.text;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
      onPress={props.onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: props.selected ? palette.tint : palette.backgroundElement,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <SymbolView name={chip.symbol} size={16} tintColor={foreground} />
      <Text style={{ fontSize: 15, color: foreground }}>{chip.label}</Text>
    </Pressable>
  );
}
