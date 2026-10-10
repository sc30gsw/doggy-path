# Sign in

Sign in lets an Owner create an account or enter an existing one with email and password. A new account continues to dog-profile onboarding. An account that already has a dog profile continues to the Home tab.

## Sub-features

- `sign-in-open` shows the email and password fields when nobody is signed in.
- `sign-in-validate` shows a field error before calling Convex.
- `sign-up` creates an account and lands on onboarding.
- `sign-in-existing` opens Home for an Owner who already saved a dog profile.
- `sign-in-reject` shows the auth failure line and stays on the form.

## How to get to it (user POV)

- Cold launch while signed out. The stack guard shows the sign-in screen under the header `doggy-path`. There is no tab bar yet.
- After `サインアウト` on the Profile tab, the same screen returns.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `metro: up`, `convex-url: set`, and `worth-driving: yes`.
- The Convex deployment is the development one in `.env.local`, and it is accepting auth requests.
- The Owner, not the agent, enters any password that reaches Convex. The agent drives only `sign-in-open` and `sign-in-validate`, then waits for the Owner's result screen.

- **Open the screen.** Run `verify-doggy-path open dev-client`, then `verify-doggy-path drive sign-in`. When the result is `surface-ready`, the first group shows placeholders `メールアドレス` and `パスワード`, the second group shows the button `ログイン`, and the third group shows `アカウントを作る`.
- **Reject a short password.** Switch the keyboard to English. Type `owner@example.com` into `メールアドレス` and `short` into `パスワード`, then press `ログイン`. The footer under the first group reads `パスワードは8文字以上にしてください`. No navigation happens.
- **Reject a bad email.** Relaunch with `verify-doggy-path open dev-client` to clear the form. Type `not-an-email` and a password of at least 8 characters, then press `ログイン`. The footer reads `メールアドレスの形式が正しくありません`.
- **Switch to sign-up.** Press `アカウントを作る`. The submit button reads `登録してはじめる` and the third group reads `ログインに戻る`.
- **Create an account.** The Owner enters a new email and a password of at least 8 characters and presses `登録してはじめる`. The onboarding screen appears under the header `プロフィール登録`, with section titles `飼い主` and `わんちゃん` and the button `はじめる`.
- **Reject unknown credentials.** The Owner presses `ログインに戻る` if needed, enters an unknown email, and presses `ログイン`. The footer reads `メールアドレスかパスワードが正しくありません` and the form stays put.
- **Proof.** Save a screenshot of each validation footer and of onboarding after registration under the run's evidence directory, named with feature id `sign-in` and entry `cold-launch`.

## Gotchas

- `verify-doggy-path drive sign-in` exiting 2 means no simulator was attached. That artifact records a blocked attempt. It does not prove sign-in.
- The two flows share one form. `アカウントを作る` and `ログインに戻る` only change the submit label. They do not navigate.
- An unknown email on `ログイン` makes Convex Auth throw `InvalidAccountId`. The development build also prints it as a red `[CONVEX A(auth:signIn)] Server Error` log in Metro and on screen. That is the expected rejection path, not a backend failure.
- A field keeps its text across a validation error. Relaunch the client to start from an empty form.
- A successful registration with no dog profile opens onboarding, not Home.
- Expo Go keeps its own secure store. Its session is separate from the dev client's.
- Do not commit the email, password, or `.env.local`.
