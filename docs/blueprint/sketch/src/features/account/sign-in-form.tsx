/**
 * Email + password, with a sign-in / sign-up toggle (ADR 0003: no verification, no reset).
 *
 * Usage (src/app/sign-in.tsx):  <SignInForm />
 * On success nothing navigates: `useSession` flips and `Stack.Protected` moves the Owner on.
 */
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
  return parseForm(credentialsSchema, draft);
}

export function SignInForm(): React.ReactElement {
  // TODO: local draft state; submit → parseCredentialsDraft → useAuthActions().signIn('password',
  //       { email, password, flow }); map Convex Auth errors ("InvalidAccountId", "InvalidSecret",
  //       account exists) to one Japanese message. @expo/ui TextInput + Button inside Host.
  throw new Error('not implemented');
}
