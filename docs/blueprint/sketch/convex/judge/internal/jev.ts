import * as vb from 'valibot';

import { env } from '../../_generated/server';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

type Described<Id extends string> = { readonly id: Id; readonly description: string };

export type ChoiceQuestion<Id extends string = string> = {
  readonly kind: 'choice';
  readonly ask: string;
  readonly options: readonly Described<Id>[];
};
export type NoulQuestion = { readonly kind: 'noul'; readonly ask: string };
export type ScoreQuestion = {
  readonly kind: 'score';
  readonly ask: string;
  readonly levelsWorstToBest: readonly Described<string>[];
};
export type JevQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion;

export type QuestionSet = { readonly [key: string]: JevQuestion | undefined };

export type JevAnswer<Q> =
  Q extends ChoiceQuestion<infer Id>
    ? { distribution: Record<Id, number>; likeliest: Id }
    : Q extends NoulQuestion
      ? { probability: number }
      : Q extends ScoreQuestion
        ? { positionTowardBest: number }
        : never;

/** Every asked question has an answer of its kind; anything less is a `malformed` failure. */
export type JevAnswers<Qs extends QuestionSet> = { -readonly [K in keyof Qs]: JevAnswer<Qs[K]> };

export type JevFailure = {
  kind: 'network' | 'http' | 'malformed';
  detail: string;
};

export type JevResult<T> = { ok: true; answers: T } | { ok: false; failure: JevFailure };

export type AskJev = <Qs extends QuestionSet>(request: {
  state: JsonObject;
  questions: Qs;
}) => Promise<JevResult<JevAnswers<Qs>>>;

export function choice<const Id extends string>({
  ask,
  options,
}: {
  ask: string;
  options: readonly Described<Id>[];
}): ChoiceQuestion<Id> {
  return { kind: 'choice', ask, options };
}

export function noul({ ask }: { ask: string }): NoulQuestion {
  return { kind: 'noul', ask };
}

export function score({
  ask,
  levelsWorstToBest,
}: {
  ask: string;
  levelsWorstToBest: readonly Described<string>[];
}): ScoreQuestion {
  return { kind: 'score', ask, levelsWorstToBest };
}

export const askJev: AskJev = async ({ state, questions }) => {
  void state;
  void questions;
  void env.JEV_API_URL;
  void env.JEV_API_KEY;
  void CALL_TIMEOUT_MS.jev;
  void guessedWireResponseSchema;
  throw new Error('not implemented');
};

const guessedWireResponseSchema = vb.object({
  answers: vb.record(
    vb.string(),
    vb.union([
      vb.object({ distribution: vb.record(vb.string(), vb.number()) }),
      vb.object({ probability: vb.number() }),
      vb.object({ position: vb.number() }),
    ]),
  ),
});
