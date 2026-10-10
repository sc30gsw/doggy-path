import * as vb from 'valibot';

import { env } from '../../_generated/server';
import { CALL_TIMEOUT_MS } from '../../domain/tuning';

const SYSTEM_ONE_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-1.13.0';
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 429, 529]);
const DEFAULT_RETRY_DELAY_MS = 500;

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export type Instructions = string | JsonObject;

type Described<Id extends string> = { readonly id: Id; readonly description: string };

const probabilitySchema = vb.pipe(vb.number(), vb.minValue(0), vb.maxValue(1));

const wireAnswerSchema = vb.variant('type', [
  vb.object({ type: vb.literal('noul'), noul: probabilitySchema }),
  vb.object({
    type: vb.literal('choice'),
    choice: vb.string(),
    probabilities: vb.record(vb.string(), probabilitySchema),
    confidence: probabilitySchema,
  }),
  vb.object({
    type: vb.literal('score'),
    score: vb.number(),
    probabilities: vb.record(vb.string(), probabilitySchema),
    confidence: probabilitySchema,
  }),
]);
type WireAnswer = vb.InferOutput<typeof wireAnswerSchema>;

const wireResponseSchema = vb.object({
  model: vb.string(),
  answers: vb.record(vb.string(), wireAnswerSchema),
});

type WireQuestion =
  | { type: 'noul'; instructions: Instructions }
  | { type: 'choice'; instructions: Instructions; criteria: Record<string, string> }
  | { type: 'score'; instructions: Instructions; criteria: string[] };

export type JevQuestion<Answer> = {
  readonly wire: WireQuestion;
  readonly read: (answer: WireAnswer) => Answer | null;
};

export type ChoiceAnswer<Id extends string> = { likeliest: Id; confidence: number };
export type NoulAnswer = { probability: number };
export type ScoreAnswer = { positionTowardBest: number };

export type ChoiceQuestion<Id extends string = string> = JevQuestion<ChoiceAnswer<Id>>;
export type NoulQuestion = JevQuestion<NoulAnswer>;
export type ScoreQuestion = JevQuestion<ScoreAnswer>;

export type QuestionSet = { readonly [key: string]: JevQuestion<unknown> };

/** Every asked question has an answer of its kind; anything less is a `malformed` failure. */
export type JevAnswers<Qs extends QuestionSet> = {
  -readonly [K in keyof Qs]: Qs[K] extends JevQuestion<infer Answer> ? Answer : never;
};

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
  optionsNeutralFirst: options,
}: {
  ask: Instructions;
  optionsNeutralFirst: readonly [Described<Id>, ...Described<Id>[]];
}): ChoiceQuestion<Id> {
  return {
    wire: {
      type: 'choice',
      instructions: ask,
      criteria: Object.fromEntries(options.map((option) => [option.id, option.description])),
    },
    read: (answer) => {
      if (answer.type !== 'choice') return null;
      const likeliest = options.find((option) => option.id === answer.choice);
      const offered = new Set<string>(options.map((option) => option.id));
      const answered = Object.keys(answer.probabilities);
      const coversExactly =
        answered.length === offered.size && answered.every((id) => offered.has(id));
      return likeliest === undefined || !coversExactly
        ? null
        : { likeliest: likeliest.id, confidence: answer.confidence };
    },
  };
}

export function noul({ ask }: { ask: Instructions }): NoulQuestion {
  return {
    wire: { type: 'noul', instructions: ask },
    read: (answer) => (answer.type === 'noul' ? { probability: answer.noul } : null),
  };
}

export function score({
  ask,
  levelsWorstToBest,
}: {
  ask: Instructions;
  levelsWorstToBest: readonly [string, string, ...string[]];
}): ScoreQuestion {
  const topLevel = levelsWorstToBest.length - 1;
  return {
    wire: { type: 'score', instructions: ask, criteria: [...levelsWorstToBest] },
    read: (answer) =>
      answer.type === 'score' && answer.score >= 0 && answer.score <= topLevel
        ? { positionTowardBest: answer.score / topLevel }
        : null,
  };
}

export function toWireRequest({
  state,
  questions,
}: {
  state: JsonObject;
  questions: QuestionSet;
}): { state: JsonObject; model: string; questions: Record<string, WireQuestion> } {
  return {
    state,
    model: JEV_MODEL,
    questions: Object.fromEntries(
      Object.entries(questions).map(([key, question]) => [key, question.wire]),
    ),
  };
}

export function readAnswers<Qs extends QuestionSet>({
  questions,
  body,
}: {
  questions: Qs;
  body: unknown;
}): JevResult<JevAnswers<Qs>> {
  const parsed = vb.safeParse(wireResponseSchema, body);
  if (!parsed.success) {
    return { ok: false, failure: { kind: 'malformed', detail: vb.summarize(parsed.issues) } };
  }
  const answers: Record<string, unknown> = {};
  for (const [key, question] of Object.entries(questions)) {
    const wire = parsed.output.answers[key];
    const answer = wire === undefined ? null : question.read(wire);
    if (answer === null) {
      return { ok: false, failure: { kind: 'malformed', detail: `no usable answer for ${key}` } };
    }
    answers[key] = answer;
  }
  return { ok: true, answers: answers as JevAnswers<Qs> };
}

export const askJev: AskJev = async ({ state, questions }) => {
  const deadline = Date.now() + CALL_TIMEOUT_MS.jev;
  const body = JSON.stringify(toWireRequest({ state, questions }));
  const post = () =>
    fetch(SYSTEM_ONE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(Math.max(0, deadline - Date.now())),
    });

  try {
    let response = await post();
    if (RETRYABLE_STATUSES.has(response.status)) {
      const delayMs = retryDelayMs(response.headers.get('retry-after'));
      if (Date.now() + delayMs < deadline) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        response = await post();
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        failure: {
          kind: 'http',
          detail: `${response.status} ${response.headers.get('x-typesafe-request-id') ?? ''}`.trim(),
        },
      };
    }
    return readAnswers({ questions, body: await response.json() });
  } catch (error) {
    return {
      ok: false,
      failure: { kind: 'network', detail: error instanceof Error ? error.message : String(error) },
    };
  }
};

function retryDelayMs(retryAfter: string | null): number {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_DELAY_MS;
}
