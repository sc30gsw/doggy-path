import { BREED_CHOICE_LABELS, JKC_BREEDS, type BreedId } from '@/convex/domain/breeds';

export type BreedOption =
  | { kind: 'jkc'; id: BreedId; label: string }
  | { kind: 'mixed'; label: typeof BREED_CHOICE_LABELS.mixed }
  | { kind: 'other'; label: typeof BREED_CHOICE_LABELS.other };

/**
 * Matches the query against `ja` and `kana`, ignoring hiragana/katakana, full/half width,
 * "・" and spaces. "ミックス" and "その他" are always listed last, whatever the query.
 */
export function searchBreeds(query: string): BreedOption[] {
  void query;
  void JKC_BREEDS;
  void BREED_CHOICE_LABELS;
  throw new Error('not implemented');
}
