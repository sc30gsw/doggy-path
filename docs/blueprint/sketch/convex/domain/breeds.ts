/**
 * The JKC Breed catalog. The ONE list of breeds in the repo.
 *
 * Everything else is derived from `JKC_BREEDS`:
 * - `BreedId` (the type) and `isJkcBreedId` (the boundary check in `findOwnerProblems`),
 * - the client's searchable breed picker (`src/features/dog-profile/breed-search.ts`),
 * - the Japanese label sent to Jev (`breedLabel` in `./dogProfile.ts`).
 *
 * Shared with the client: pure data + `convex/values` only. Never import server code here.
 *
 * Storage keeps the id as `v.string()`, not a ~200-member literal union: the schema stays
 * small and the list stays append-only without a schema push per breed. The id is checked
 * at the one write boundary (`owners.save`). Add breeds freely; never rename ids, because
 * stored Dog Profiles reference them.
 */
import { v } from 'convex/values';

type BreedEntry = {
  /** Stable storage key, kebab-case English. */
  readonly id: string;
  /** JKC Japanese name, shown in the UI and sent to Jev. */
  readonly ja: string;
  /** Katakana/hiragana reading used for search when `ja` contains kanji or symbols. */
  readonly kana: string;
};

export const JKC_BREEDS = [
  { id: 'toy-poodle', ja: 'トイ・プードル', kana: 'といぷーどる' },
  { id: 'chihuahua', ja: 'チワワ', kana: 'ちわわ' },
  { id: 'miniature-dachshund', ja: 'ミニチュア・ダックスフンド', kana: 'みにちゅあだっくすふんど' },
  { id: 'pomeranian', ja: 'ポメラニアン', kana: 'ぽめらにあん' },
  { id: 'shiba', ja: '柴', kana: 'しば' },
  { id: 'yorkshire-terrier', ja: 'ヨークシャー・テリア', kana: 'よーくしゃーてりあ' },
  { id: 'shih-tzu', ja: 'シー・ズー', kana: 'しーずー' },
  { id: 'french-bulldog', ja: 'フレンチ・ブルドッグ', kana: 'ふれんちぶるどっぐ' },
  { id: 'golden-retriever', ja: 'ゴールデン・レトリーバー', kana: 'ごーるでんれとりーばー' },
  { id: 'labrador-retriever', ja: 'ラブラドール・レトリーバー', kana: 'らぶらどーるれとりーばー' },
  // TODO(Feature 1): the full JKC list (~200 entries). Keep this array the only list.
] as const satisfies readonly BreedEntry[];

export type BreedId = (typeof JKC_BREEDS)[number]['id'];

const JKC_BREED_IDS: ReadonlySet<string> = new Set(JKC_BREEDS.map((breed) => breed.id));

/** The boundary check for stored ids (they are `v.string()` in the schema). */
export function isJkcBreedId(id: string): id is BreedId {
  return JKC_BREED_IDS.has(id);
}

/**
 * A Breed as stored: a JKC breed, "ミックス", or "その他" with free text.
 * A discriminated union, so "other without text" and "jkc without id" cannot be stored.
 */
export const breedValidator = v.union(
  v.object({ kind: v.literal('jkc'), id: v.string() }),
  v.object({ kind: v.literal('mixed') }),
  v.object({ kind: v.literal('other'), text: v.string() }),
);
