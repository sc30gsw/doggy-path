/**
 * Breed search over the one catalog (`JKC_BREEDS`), plus the two fixed choices.
 * Pure, so it is unit-tested without rendering.
 */
import { JKC_BREEDS, type BreedId } from '@/convex/domain/breeds';

export type BreedOption =
  | { kind: 'jkc'; id: BreedId; label: string }
  | { kind: 'mixed'; label: 'ミックス' }
  | { kind: 'other'; label: 'その他' };

/**
 * Matches the query against `ja` and `kana`, ignoring hiragana/katakana, full/half width,
 * "・" and spaces. "ミックス" and "その他" are always listed last, whatever the query.
 */
export function searchBreeds(query: string): BreedOption[] {
  void query;
  void JKC_BREEDS;
  // TODO: normalize = NFKC → katakana→hiragana → strip "・" / spaces / "ー"? (keep "ー");
  //       prefix matches first, then substring matches, catalog order within each.
  throw new Error('not implemented');
}
