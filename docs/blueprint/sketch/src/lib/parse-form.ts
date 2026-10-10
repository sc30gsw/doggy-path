/**
 * The one way a form turns its draft into a domain value (ADR 0002: Valibot guards the
 * app's forms). Each form module keeps its Valibot schema private and exports a
 * `parseXDraft(draft): FormResult<DomainType, keyof Draft>` built on this.
 */
import * as vb from 'valibot';

/** Field-keyed messages, already in Japanese, ready to render under each field. */
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type FormResult<Value, Field extends string> =
  | { ok: true; value: Value }
  | { ok: false; errors: FieldErrors<Field> };

export function parseForm<
  Schema extends vb.GenericSchema<unknown, unknown>,
  Field extends string,
>(schema: Schema, draft: unknown): FormResult<vb.InferOutput<Schema>, Field> {
  void schema;
  void draft;
  // TODO: vb.safeParse → ok ? { ok, value: output } : { ok:false, errors: first message per
  //       top-level key from vb.flatten(issues).nested } (keys outside Field are dropped).
  throw new Error('not implemented');
}
