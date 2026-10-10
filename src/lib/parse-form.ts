import * as vb from 'valibot';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type FormResult<Value, Field extends string> =
  | { ok: true; value: Value }
  | { ok: false; errors: FieldErrors<Field> };

export function parseForm<Schema extends vb.GenericSchema<unknown, unknown>, Field extends string>({
  schema,
  draft,
}: {
  schema: Schema;
  draft: unknown;
}): FormResult<vb.InferOutput<Schema>, Field> {
  const parsed = vb.safeParse(schema, draft);
  if (parsed.success) return { ok: true, value: parsed.output };
  return { ok: false, errors: fieldErrors(parsed.issues) };
}

function fieldErrors<Field extends string>(
  issues: [vb.BaseIssue<unknown>, ...vb.BaseIssue<unknown>[]],
): FieldErrors<Field> {
  const nested = vb.flatten(issues).nested;
  const errors: FieldErrors<Field> = {};
  if (!nested) return errors;
  for (const [key, messages] of Object.entries(nested)) assignFirst(errors, key, messages);
  return errors;
}

function assignFirst<Field extends string>(
  errors: FieldErrors<Field>,
  key: string,
  messages: readonly string[] | undefined,
) {
  const first = messages?.[0];
  if (first !== undefined) Object.assign(errors, { [key]: first });
}
