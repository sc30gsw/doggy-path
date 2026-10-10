import * as vb from 'valibot';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type FormResult<Value, Field extends string> =
  | { ok: true; value: Value }
  | { ok: false; errors: FieldErrors<Field> };

export function parseForm<
  Schema extends vb.GenericSchema<unknown, unknown>,
  Field extends string,
>({ schema, draft }: { schema: Schema; draft: unknown }): FormResult<vb.InferOutput<Schema>, Field> {
  void schema;
  void draft;
  throw new Error('not implemented');
}
