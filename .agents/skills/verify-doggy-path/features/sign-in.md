# Sign in

Sign in lets an Owner create an account or enter an existing one with email and password. A new account continues to dog-profile onboarding. An account that already has a dog profile continues to the Home tab.

## Sub-features

- `sign-in-open` shows the email and password fields when nobody is signed in.
- `sign-in-validate` shows a field error before calling Convex.
- `sign-up` creates an account and lands on onboarding.
- `sign-in-existing` opens Home for an Owner who already saved a dog profile.
- `sign-in-reject` shows the auth failure line and stays on the form.

## How to get to it (user POV)

- Cold launch while signed out. The stack guard shows the sign-in screen under the header `doggy-path`, with no tab bar. `device.clearKeychain()` before `app.open()` gets there from any state.
- `サインアウト` on the Profile tab returns here.

## Driving it with e2e

- Test: `tests/sign-in.e2e.ts` pins `sign-in-validate` (short password, malformed email, the sign-up toggle). `tests/smoke.e2e.ts` pins `sign-in-open`. Neither reaches Convex.
- Locators: `getByPlaceholder('メールアドレス')`, `getByPlaceholder('パスワード')`, `getByRole('button', 'ログイン')`, `getByRole('button', 'アカウントを作る')`, after the toggle `getByRole('button', '登録してはじめる')` and `getByRole('button', 'ログインに戻る')`. Errors by `getByText`.
- `sign-up`, `sign-in-existing` and `sign-in-reject` reach the Convex deployment. Drive them only with a disposable account (`credentials.user('owner')`), filling the password as a `Secret`. Without one, the Owner types the password.
- Live walk: `open_session {target: "ios"}`, `observe`, `locate {placeholder: "メールアドレス"}` and `locate {role: "button", name: "ログイン"}`, `type` `owner@example.com` and `short`, `tap` `ログイン`, `screenshot`.

## Proof

- Validation: the footer under the first group reads `パスワードは8文字以上にしてください` or `メールアドレスの形式が正しくありません`, and `ログイン` is still on screen. Nothing is written to Convex.
- Sign-up: onboarding appears under `プロフィール登録` with section titles `飼い主` and `わんちゃん` and the button `はじめる`, and the new user row exists on the development deployment.
- Rejection: the footer reads `メールアドレスかパスワードが正しくありません` and the form stays.

## Charters

```
sign-in-errors|ios|fuzzer|Starting signed out on the sign-in screen, submit ログイン and 登録してはじめる with an empty email, a malformed email, a 300-character email, unicode, leading spaces, and a 7-character password, judging each footer before the next; never sign in successfully; report validation that is missing, wrong, or leaks detail
sign-in-toggle|ios|skeptic|Starting signed out on the sign-in screen, switch between アカウントを作る and ログインに戻る after typing values and after an error; report labels, footers, or typed text that end up inconsistent with the mode shown
```

## Gotchas

- The two flows share one form. `アカウントを作る` and `ログインに戻る` change the submit label and clear the error footer. They keep the typed text and do not navigate.
- Validation shows one error at a time, the email error first. A malformed email with a short password shows only `メールアドレスの形式が正しくありません`.
- Every Convex rejection, including sign-up with an email that already has an account, shows the same `メールアドレスかパスワードが正しくありません`. The submit button is disabled while the request runs.
- An unknown email on `ログイン` makes Convex Auth throw `InvalidAccountId`, printed as a red `[CONVEX A(auth:signIn)] Server Error` in `.e2e/logs/metro.log` and on screen in a dev build. That is the expected rejection path, not a backend failure.
- A field keeps its text across a validation error. Relaunch with `app.open()` to start from an empty form.
- A successful registration with no dog profile opens onboarding, not Home.
- Never commit the email, the password, or `.env.local`.
