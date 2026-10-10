import { BREED_CHOICE_LABELS, JKC_BREEDS, type BreedId } from '@/convex/domain/breeds';

export type BreedOption =
  | { kind: 'jkc'; id: BreedId; label: string }
  | { kind: 'mixed'; label: typeof BREED_CHOICE_LABELS.mixed }
  | { kind: 'other'; label: typeof BREED_CHOICE_LABELS.other };

function normalizeBreedText(value: string): string {
  const nfkc = value.normalize('NFKC');
  const hiragana = nfkc.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
  return hiragana.replace(/[・\s]/g, '');
}

function matchRank(fields: readonly string[], needle: string): 'prefix' | 'substring' | 'none' {
  if (needle === '' || fields.some((field) => field.startsWith(needle))) return 'prefix';
  if (fields.some((field) => field.includes(needle))) return 'substring';
  return 'none';
}

export function searchBreeds(query: string): BreedOption[] {
  const needle = normalizeBreedText(query);
  const grouped: Record<'prefix' | 'substring', BreedOption[]> = { prefix: [], substring: [] };
  for (const breed of JKC_BREEDS) {
    const rank = matchRank([normalizeBreedText(breed.ja), normalizeBreedText(breed.kana)], needle);
    if (rank === 'none') continue;
    grouped[rank].push({ kind: 'jkc', id: breed.id, label: breed.ja });
  }
  return [
    ...grouped.prefix,
    ...grouped.substring,
    { kind: 'mixed', label: BREED_CHOICE_LABELS.mixed },
    { kind: 'other', label: BREED_CHOICE_LABELS.other },
  ];
}
