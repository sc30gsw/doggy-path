import { v } from 'convex/values';

type BreedEntry = {
  readonly id: string;
  readonly ja: string;
  readonly kana: string;
  readonly en: string;
};

export const JKC_BREEDS = [
  { id: 'toy-poodle', ja: 'トイ・プードル', kana: 'といぷーどる', en: 'Toy Poodle' },
  { id: 'chihuahua', ja: 'チワワ', kana: 'ちわわ', en: 'Chihuahua' },
  {
    id: 'miniature-dachshund',
    ja: 'ミニチュア・ダックスフンド',
    kana: 'みにちゅあだっくすふんど',
    en: 'Miniature Dachshund',
  },
  { id: 'pomeranian', ja: 'ポメラニアン', kana: 'ぽめらにあん', en: 'Pomeranian' },
  { id: 'shiba', ja: '柴', kana: 'しば', en: 'Shiba' },
  { id: 'yorkshire-terrier', ja: 'ヨークシャー・テリア', kana: 'よーくしゃーてりあ', en: 'Yorkshire Terrier' },
  { id: 'shih-tzu', ja: 'シー・ズー', kana: 'しーずー', en: 'Shih Tzu' },
  { id: 'french-bulldog', ja: 'フレンチ・ブルドッグ', kana: 'ふれんちぶるどっぐ', en: 'French Bulldog' },
  {
    id: 'golden-retriever',
    ja: 'ゴールデン・レトリーバー',
    kana: 'ごーるでんれとりーばー',
    en: 'Golden Retriever',
  },
  {
    id: 'labrador-retriever',
    ja: 'ラブラドール・レトリーバー',
    kana: 'らぶらどーるれとりーばー',
    en: 'Labrador Retriever',
  },
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
