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

- Test: none yet. A first test signs in as credential `owner` (an account that already has a profile), taps the `プロフィール` tab, fills `メモ`, taps `保存する`, expects `保存しました`, then `app.open()` and expects the memo value back with `toHaveValue`.
- Locators to check with `locate` first: the tab item `プロフィール` (by text or label, not `tab` role), `getByRole('button', '保存する')`, `getByRole('button', 'はじめる')`, `getByRole('button', '犬種を選ぶ')`, the breed search `getByPlaceholder('犬種を検索')`, breed rows `getByRole('button', '<breed>')`, `getByPlaceholder('メモ')`. The two `名前` fields share a placeholder: tell them apart by order or section.
- Live walk: sign in, `tap` `プロフィール`, `observe`, `type` into `メモ`, `scroll` until `保存する` clears the tab bar, `tap` it, `screenshot`.

## Proof

- Onboarding: after `はじめる`, Home appears under `ホーム` with the button `コースを提案してもらう`, and the dog profile row exists on the development deployment.
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
- `保存しました` stays until the next submit. While saving the button is disabled and no footer shows. A failed save shows `保存できませんでした`.
