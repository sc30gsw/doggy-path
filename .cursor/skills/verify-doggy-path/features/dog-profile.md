# Dog profile

Dog profile is the Owner's name plus the dog's name, breed, birth month, and sex. Weight and a memo are optional. The first save finishes onboarding and opens Home. Later saves happen on the Profile tab and stay there.

## Sub-features

- `profile-onboarding` collects the first profile after sign-up.
- `profile-edit` changes a saved profile from the Profile tab and confirms the save.
- `profile-breed` picks a JKC breed, `ミックス`, or `その他` from a searchable sheet.
- `profile-sign-out` returns to the sign-in screen.

## How to get to it (user POV)

- Finish sign-up. The app opens onboarding under the header `プロフィール登録`. The submit button reads `はじめる`.
- On the tab bar, choose `プロフィール`. The same form is shown under the header `プロフィール`, with submit button `保存する` and a last group `サインアウト`.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- For onboarding, the account is signed in and has no dog profile yet.
- For the Profile tab, the account already has a saved profile, so the tab bar is visible.

- **Open onboarding.** Complete `sign-up` in [sign-in.md](./sign-in.md). Run `verify-doggy-path drive dog-profile`. The groups `飼い主` and `わんちゃん` are visible, and the rows read `犬種 … 犬種を選ぶ`, `生まれ年`, `生まれ月`, `推定`, `性別 … 選択`, `体重 (kg)`, and `メモ`.
- **Fill the required fields.** Switch the keyboard to English. In `飼い主`, type `Taro` into `名前`. In `わんちゃん`, type `Pochi` into `名前` and press return. Press `犬種を選ぶ`. A sheet with the search field `犬種を検索` and the button `閉じる` opens. Choose a row such as `秋田`. The sheet closes and the row reads `犬種 … 秋田`. Open the `性別` menu and choose `オス`. Leave `体重 (kg)` and `メモ` empty.
- **Save the first profile.** Scroll to the last group and press `はじめる`. The Home tab appears under the header `ホーム` with the button `コースを提案してもらう`.
- **Edit from the Profile tab.** Press `プロフィール`. Type `evening walk` into `メモ`, scroll until `保存する` is above the tab bar, and press it. The footer under that group reads `保存しました`. Run `verify-doggy-path open dev-client`, open `プロフィール` again, and confirm `メモ` still reads `evening walk`.
- **Sign out.** On `プロフィール`, press `サインアウト`. The sign-in form returns under the header `doggy-path`.
- **Proof.** Screenshot Home after `はじめる`, the `保存しました` footer, and the Profile tab after the relaunch with the memo visible. Store them with feature id `dog-profile`.

## Gotchas

- Both name fields use the placeholder `名前`. The section title distinguishes `飼い主` from `わんちゃん`.
- Signing out ends the session, and only the Owner can sign back in. Drive `profile-sign-out` last.
- `ミックス` and `その他` are the last rows of the breed list. Choosing `その他` adds a `犬種` text field under the breed row. Choosing `その他` again keeps the typed text. Each time the sheet opens, the search starts empty.
- The birth-month menu hides future months in the current year. A future month is not a valid proof value.
- `推定` is a switch on the birth month. Leaving it off is a complete profile.
- A failed parse shows the field error in red under that field, and the footer under the submit group reads `入力内容を確認してください`. Scroll up to find the field.
- A failed save shows `保存できませんでした` in the footer under the submit group. A later invalid submit replaces `保存しました` with `入力内容を確認してください`.
- Typing Japanese works with real kana key taps. Simulator text input must go through the English keyboard.
