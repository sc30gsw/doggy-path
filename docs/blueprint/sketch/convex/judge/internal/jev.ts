/**
 * Jev (TypeSafe System One) behind a small typed interface. The ONLY file that knows
 * Jev's wire format, endpoint, or API key.
 *
 * Callers describe questions with `choice` / `noul` / `score` and get answers typed from
 * those descriptions: a Choice over `'slow' | 'normal' | 'brisk'` answers with a
 * distribution keyed by exactly those ids. The wire format is unknown today; when it is
 * learned, only `toWireRequest` and `wireResponseSchema` below change.
 *
 * Server-only (reads `process.env.JEV_API_KEY`). Never import from the client.
 */
import * as vb from 'valibot';

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

/** A described option or level. Descriptions are what Jev reads; ids are what code reads. */
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
  /** Ordered worst → best. */
  readonly levels: readonly Described<string>[];
};
export type JevQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion;

/** Questions sent together over one state. Optional entries are simply not asked. */
export type QuestionSet = { readonly [key: string]: JevQuestion | undefined };

export type JevAnswer<Q> =
  Q extends ChoiceQuestion<infer Id>
    ? { distribution: Record<Id, number>; likeliest: Id }
    : Q extends NoulQuestion
      ? { probability: number }
      : Q extends ScoreQuestion
        ? /** Probability-weighted position on the levels, 0 = first level, 1 = last. */
          { position: number }
        : never;

/** Answers keyed like the questions; an optional question yields an optional answer. */
export type JevAnswers<Qs extends QuestionSet> = { -readonly [K in keyof Qs]: JevAnswer<Qs[K]> };

export type JevFailure = {
  kind: 'unconfigured' | 'network' | 'http' | 'malformed';
  detail: string;
};

export type JevResult<T> = { ok: true; answers: T } | { ok: false; failure: JevFailure };

/** The injectable seam: tests pass a fake `AskJev`; production uses `askJev`. */
export type AskJev = <Qs extends QuestionSet>(
  state: JsonObject,
  questions: Qs,
) => Promise<JevResult<JevAnswers<Qs>>>;

export function choice<const Id extends string>(
  ask: string,
  options: readonly Described<Id>[],
): ChoiceQuestion<Id> {
  return { kind: 'choice', ask, options };
}

export function noul(ask: string): NoulQuestion {
  return { kind: 'noul', ask };
}

export function score(ask: string, levels: readonly Described<string>[]): ScoreQuestion {
  return { kind: 'score', ask, levels };
}

/**
 * One HTTP request: all questions over one state, answered in parallel by Jev.
 * Never throws: every failure is a `JevResult` the caller must handle (the proposal
 * has a defined fallback for each Jev call, so a forgotten catch is a type error, not a crash).
 */
export const askJev: AskJev = async (state, questions) => {
  void state;
  void questions;
  void wireResponseSchema;
  // TODO:
  //   1. key = process.env.JEV_API_KEY, url = process.env.JEV_API_URL; missing → {ok:false, unconfigured}.
  //   2. body = toWireRequest(state, questions) (drop undefined entries).
  //   3. fetch with AbortSignal.timeout(15_000); non-2xx → http; throw → network.
  //   4. vb.safeParse(wireResponseSchema, json) → malformed on failure.
  //   5. readAnswers(questions, parsed): per question kind,
  //        choice: distribution keys must equal option ids (else malformed); normalise to sum 1;
  //                likeliest = argmax.
  //        noul:   probability in [0,1].
  //        score:  if the wire gives a level distribution, position = Σ p_i · i/(n−1);
  //                if it gives a single position, clamp to [0,1].
  //      The cast-free way: build the answers object by iterating `questions` entries.
  throw new Error('not implemented');
};

// ── Wire format (private; a GUESS until Jev docs are available) ───────────────────────

/** TODO: replace with the real response shape. Keep it private to this file. */
const wireResponseSchema = vb.object({
  answers: vb.record(
    vb.string(),
    vb.union([
      vb.object({ distribution: vb.record(vb.string(), vb.number()) }),
      vb.object({ probability: vb.number() }),
    ]),
  ),
});
