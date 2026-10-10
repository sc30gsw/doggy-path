# Sign in

Sign in lets an Owner create an account or enter an existing one with email and password. A new account continues to dog-profile onboarding. An account that already has a dog profile continues to the Home tab.

## Sub-features

- `sign-in-open` shows the email and password fields when nobody is signed in.
- `sign-in-validate` shows a field error before calling Convex.
- `sign-up` creates an account and lands on onboarding.
- `sign-in-existing` opens Home for an Owner who already saved a dog profile.
- `sign-in-reject` shows the auth failure line and stays on the form.

## How to get to it (user POV)

- Cold launch while signed out. The stack guard shows the sign-in screen. There is no tab bar yet.
- After `サインアウト` on the Profile tab, the same screen returns.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `metro: up`, `convex-url: set`, and `worth-driving: yes`.
- The Convex deployment is the development one in `.env.local`, and it is accepting auth requests.
- Use a fresh email for `sign-up`. Use an email that already has a saved dog profile for `sign-in-existing`.

- **Open the screen.** Launch the native client at `exp://127.0.0.1:8081`. Run `verify-doggy-path drive sign-in`. When the result is `surface-ready`, the screen shows placeholders `メールアドレス` and `パスワード`, a button `ログイン`, and a button `アカウントを作る`.
- **Reject a short password.** Type `owner@example.com` and `short`, then press `ログイン`. The text `パスワードは8文字以上にしてください` appears. No navigation happens.
- **Reject a bad email.** Clear the email, type `not-an-email` and a password of at least 8 characters, then press `ログイン`. The text `メールアドレスの形式が正しくありません` appears.
- **Create an account.** Press `アカウントを作る`. The submit button label becomes `登録してはじめる`. Enter a new email and a password of at least 8 characters, then press `登録してはじめる`. The onboarding screen appears, with section titles `飼い主` and `わんちゃん` and the button `はじめる`.
- **Reject unknown credentials.** From a signed-out screen, press `ログインに戻る` if the form is in the sign-up flow. Enter an unknown email and a password of at least 8 characters, then press `ログイン`. The text `メールアドレスかパスワードが正しくありません` appears and the form stays put.
- **Proof.** Save a screenshot of the validation error and a screenshot of onboarding after a successful registration under the run's evidence directory. The files include the feature id `sign-in` and the entry `cold-launch`.

## Gotchas

- `verify-doggy-path drive sign-in` exiting 2 means no native surface was attached. That artifact records a blocked attempt. It does not prove sign-in.
- Password storage uses `expo-secure-store`. A web preview is not available in this repo.
- The two flows share one form. `アカウントを作る` and `ログインに戻る` only change the submit label. They do not navigate.
- A successful registration with no dog profile opens onboarding, not Home.
- Do not commit the email, password, or `.env.local`.
