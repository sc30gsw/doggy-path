# Dog profile

Dog profile is the Owner's name plus the dog's name, breed, birth month, and sex. Weight and a memo are optional. The first save finishes onboarding and opens Home. Later saves happen on the Profile tab and stay there.

## Sub-features

- `profile-onboarding` collects the first profile after sign-up.
- `profile-edit` changes a saved profile from the Profile tab and confirms the save.
- `profile-breed` picks a JKC breed, `ミックス`, or `その他` from a searchable sheet.
- `profile-sign-out` returns to the sign-in screen.

## How to get to it (user POV)

- Finish sign-up. Onboarding opens under the header `プロフィール登録`, submit button `はじめる`. Needs an account with no dog profile.
- On the tab bar, choose `プロフィール`. The same form is under the header `プロフィール`, with submit button `保存する` and a last group `サインアウト`. Needs an account with a saved profile.

## Driving it with e2e

- Test: `tests/dog-profile.e2e.ts`, serial on one fresh account. It pins `profile-onboarding` (a new account lands on onboarding; `はじめる` on an empty form names every missing field; a complete profile opens Home), `profile-edit` (a weight typed into `体重 (kg)` and saved reads back after `app.open()`), `profile-breed` (`その他` adds the `犬種` text field), and `profile-sign-out` last. The onboarding steps are `completeOnboarding` in `tests/support/owner.ts`.
- Locators: the tab item `getByText('プロフィール')` (not `tab` role), `getByRole('button', '保存する')`, `getByRole('button', 'はじめる')`, `getByRole('button', '犬種を選ぶ')` (after a choice the row's button is the breed, such as `柴`), the breed search `getByPlaceholder('犬種を検索')`, breed rows `getByRole('button', '<breed>')`, the sex menu `getByRole('button', '選択')` then `オス` or `メス`, `getByPlaceholder('体重 (kg)')`, `getByPlaceholder('メモ')`, `getByRole('button', 'サインアウト')`. The two `名前` fields share a placeholder: `nth(0)` is the Owner, `nth(1)` the dog.
- Live walk: sign in, `tap` `プロフィール`, `observe`, `type` into `体重 (kg)`, `dismiss_keyboard`, `scroll` until `保存する` clears the tab bar, `tap` it, `screenshot`, close and reopen the session, read `体重 (kg)` again.

## Proof

- Onboarding: after `はじめる`, Home appears under `ホーム` with `今日の散歩コースを提案します` and the button `コースを提案してもらう`, and the dog profile row exists on the local e2e deployment.
- Edit: the footer under the submit group reads `保存しました`, and after a relaunch the Profile tab shows the new value. The relaunch read is the proof the row was written, not the footer.
- Sign out: the sign-in form returns under `doggy-path`.

## Charters

```
profile-fields|ios|fuzzer|Sign in as credential owner. On the プロフィール tab, submit 保存する with each name empty, a 41-character name, a 501-character メモ, weight 0.4, 100.1 and abc, and その他 with an empty 犬種, judging each error before the next; never press サインアウト; report validation that is missing, wrong, or shown in the wrong place
profile-persist|ios|skeptic|Sign in as credential owner. On the プロフィール tab, change the breed, birth month, sex and memo, save, then relaunch the app and compare every field with what was saved; never press サインアウト; report any value lost or changed
```

## Gotchas

- Signing out ends the session. Drive `profile-sign-out` last, and never in a bug bash.
- `ミックス` and `その他` are the last rows of the breed list. Choosing `その他` adds a text field with the placeholder `犬種` under the breed row; choosing it again keeps the typed text. The search starts empty each time the sheet opens.
- Choosing `その他` with an empty `犬種` shows only the footer `入力内容を確認してください` and no field error, because the error key is `breed.text` and the form renders `breed`. Known product gap.
- The birth-month menu hides future months in the current year. `推定` is a switch on the birth month; leaving it off is a complete profile.
- Field errors appear in red under the field, with `入力内容を確認してください` in the submit footer: `飼い主の名前を入力してください`, `わんちゃんの名前を入力してください`, `犬種を選んでください`, `性別を選んでください`, `体重は0.5〜100kgで入力してください`. Scroll up to find the field.
- Limits: names and the `その他` text up to 40 characters, the memo up to 500, weight 0.5 to 100 kg, birth years 1995 to this year.
- The runner cannot clear the multiline `メモ`, and cannot confirm a `fill` into the `体重 (kg)` number pad: `clear()`, `pressSequentially`, `dismissKeyboard`. Prove an edit through 体重 or another single-line field.
- Onboarding defaults the birth month to the current month, so the test dog is a newborn. With a real `TYPESAFE_API_KEY` the LLM load check reacts to that on Home.
- `保存しました` stays until the next submit. While saving the button is disabled and no footer shows. A failed save shows `保存できませんでした`.
