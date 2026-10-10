import * as vb from 'valibot';

import { parseForm, type FormResult } from '@/lib/parse-form';

export type CredentialsDraft = { email: string; password: string; flow: 'signIn' | 'signUp' };

const credentialsSchema = vb.object({
  email: vb.pipe(vb.string(), vb.trim(), vb.email('メールアドレスの形式が正しくありません')),
  password: vb.pipe(vb.string(), vb.minLength(8, 'パスワードは8文字以上にしてください')),
  flow: vb.picklist(['signIn', 'signUp']),
});

export function parseCredentialsDraft(
  draft: CredentialsDraft,
): FormResult<CredentialsDraft, keyof CredentialsDraft> {
  return parseForm({ schema: credentialsSchema, draft });
}

export function SignInForm(): React.ReactElement {
  throw new Error('not implemented');
}
