# Dog profile

Dog profile is the Owner's name plus the dog's name, breed, birth month, and sex. Weight and a memo are optional. The first save finishes onboarding and opens Home. Later saves happen on the Profile tab and stay there.

## Sub-features

- `profile-onboarding` collects the first profile after sign-up.
- `profile-edit` changes a saved profile from the Profile tab.
- `profile-breed` picks a JKC breed, `ミックス`, or `その他`.
- `profile-sign-out` returns to the sign-in screen.

## How to get to it (user POV)

- Finish sign-up. The app opens onboarding on its own. The submit button reads `はじめる`.
- On the tab bar, choose `プロフィール`. The same form is shown with submit button `保存する` and a second button `サインアウト`.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- For onboarding, the account is signed in and has no dog profile yet.
- For the Profile tab, the account already has a saved profile, so the tab bar is visible.

- **Open onboarding.** Complete `sign-up` in [sign-in.md](./sign-in.md). Run `verify-doggy-path drive dog-profile`. The sections `飼い主` and `わんちゃん` are visible.
- **Fill the required fields.** In `飼い主`, set `名前` to `太郎`. In `わんちゃん`, set `名前` to `ポチ`. Press `犬種を選ぶ`, type `トイプードル` into `犬種を検索`, and choose that row. Set a birth year and month that are not in the future. Set sex to `オス`. Leave `体重 (kg)` and `メモ` empty.
- **Save the first profile.** Press `はじめる`. The Home tab appears, labeled `ホーム`, and the button `コースを提案してもらう` is visible.
- **Edit from the Profile tab.** Press `プロフィール`. Change the dog's `メモ` to `夕方の散歩`. Press `保存する`. Leave the screen and open `プロフィール` again. The memo still reads `夕方の散歩`.
- **Sign out.** On `プロフィール`, press `サインアウト`. The sign-in form returns.
- **Proof.** Screenshot Home after `はじめる`, then screenshot the Profile tab after reopening it, with `夕方の散歩` visible. Store both in the run evidence directory with feature id `dog-profile`.

## Gotchas

- Both name fields use the placeholder `名前`. The section title distinguishes `飼い主` from `わんちゃん`.
- `犬種を選ぶ` opens a modal. `ミックス` and `その他` are rows in that list. Choosing `その他` reveals a `犬種` text field.
- The birth-month picker hides future months in the current year. A future month is not a valid proof value.
- `推定` is a switch on the birth month. Leaving it off is a complete profile.
- Weight is optional. A non-numeric weight shows a field error and does not save.
- A failed save shows `保存できませんでした` on the owner name field.
- Expo Go can host this form when `expo-secure-store` is present. The map is not part of this proof.
