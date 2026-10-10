import { v } from 'convex/values';

type BreedEntry = {
  readonly id: string;
  readonly ja: string;
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
] as const satisfies readonly BreedEntry[];

export type BreedId = (typeof JKC_BREEDS)[number]['id'];

export const BREED_CHOICE_LABELS = { mixed: 'ミックス', other: 'その他' } as const;

const JKC_BREED_IDS: ReadonlySet<string> = new Set(JKC_BREEDS.map((breed) => breed.id));

export function isJkcBreedId(id: string): id is BreedId {
  return JKC_BREED_IDS.has(id);
}

export const breedValidator = v.union(
  v.object({ kind: v.literal('jkc'), id: v.string() }),
  v.object({ kind: v.literal('mixed') }),
  v.object({ kind: v.literal('other'), text: v.string() }),
);
