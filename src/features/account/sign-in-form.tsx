import { useAuthActions } from '@convex-dev/auth/react';
import { Button, Column, Host, Text, TextInput } from '@expo/ui';
import { useState } from 'react';
import * as vb from 'valibot';

import { parseForm, type FormResult } from '@/lib/parse-form';

type CredentialsDraft = { email: string; password: string; flow: 'signIn' | 'signUp' };

const SIGN_IN_FAILURE = 'メールアドレスかパスワードが正しくありません';

const credentialsSchema = vb.object({
  email: vb.pipe(vb.string(), vb.trim(), vb.email('メールアドレスの形式が正しくありません')),
  password: vb.pipe(vb.string(), vb.minLength(8, 'パスワードは8文字以上にしてください')),
  flow: vb.picklist(['signIn', 'signUp']),
});

function parseCredentialsDraft(
  draft: CredentialsDraft,
): FormResult<CredentialsDraft, keyof CredentialsDraft> {
  return parseForm({ schema: credentialsSchema, draft });
}

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<CredentialsDraft['flow']>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const submit = () => {
    const parsed = parseCredentialsDraft({ email, password, flow });
    if (!parsed.ok) {
      setError(parsed.errors.email ?? parsed.errors.password);
      return;
    }
    setPending(true);
    setError(undefined);
    void signIn('password', parsed.value)
      .catch(() => {
        setError(SIGN_IN_FAILURE);
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <Host style={{ flex: 1 }}>
      <Column spacing={12}>
        <TextInput
          placeholder="メールアドレス"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setEmail}
        />
        <TextInput placeholder="パスワード" secureTextEntry onChangeText={setPassword} />
        {error ? <Text>{error}</Text> : null}
        <Button
          label={flow === 'signIn' ? 'ログイン' : '登録してはじめる'}
          disabled={pending}
          onPress={submit}
        />
        <Button
          variant="text"
          label={flow === 'signIn' ? 'アカウントを作る' : 'ログインに戻る'}
          onPress={() => {
            setFlow((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
            setError(undefined);
          }}
        />
      </Column>
    </Host>
  );
}
