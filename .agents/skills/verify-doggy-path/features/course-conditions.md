# Course conditions

Course conditions is the sheet where the Owner describes today's walk. Mood, today's memo, target distance, target time, and start point may all be left empty. Submitting asks for a proposal and closes the sheet back to Home.

## Sub-features

- `conditions-open` opens a blank sheet from Home.
- `conditions-empty` submits with every field empty.
- `conditions-filled` submits a mood, a memo, a distance, a time, and a start point.
- `conditions-revise` reopens the sheet with the current proposal's conditions filled in.

## How to get to it (user POV)

- Signed in with a saved profile, on Home, press `コースを提案してもらう`. It is the centered button when nothing is proposed, the text button right of the course numbers when courses are shown, and the text button under the retry button after a failure. It is absent while a proposal is checking, building, or waiting for confirmation.
- When Home asks for confirmation, press `条件を変える`. The sheet opens with the latest proposal's conditions filled in.

## Driving it with e2e

- Test: none yet. A first test signs in as credential `owner`, taps `コースを提案してもらう`, expects the groups `今日の気分`, `目安` and `開始地点`, fills `距離 (km)` with `0.1`, taps `この条件で提案`, and expects `距離は0.2〜20kmで入力してください` with the sheet still open. That pins validation without spending a proposal.
- Locators to check with `locate` first: `getByRole('button', 'コースを提案してもらう')`, mood chips `getByRole('radio', 'のんびり')` (and `元気いっぱい`, `冒険したい`, `疲れ気味`, `気分転換`), `getByPlaceholder('今日のメモ')`, `getByPlaceholder('距離 (km)')`, `getByPlaceholder('時間 (分)')`, `getByRole('button', '現在地')`, `getByRole('button', 'クリア')`, `getByRole('button', 'この条件で提案')`.
- Dropping a pin is a `longPress` on the map; the map is native and has no accessible children, so use a point from the latest screenshot (`tap_at` lane) or press `現在地` instead.
- Live walk: from Home `tap` the propose button, `observe`, `tap` a chip, `type` the fields, `dismiss_keyboard`, `scroll` to `この条件で提案`, `screenshot`, `tap` it, `screenshot` Home.

## Proof

- The filled sheet before submit, then Home right after the sheet closes showing `条件を確認しています…`, a confirmation, a failure, or `コースを作っています…`. The pair shows the request was accepted; the new proposal row on the development deployment is the side effect.
- Validation: red text under the field and the sheet still open.

## Charters

```
conditions-input|ios|fuzzer|Sign in as credential owner. From ホーム open コースを提案してもらう and submit distance 0.1, 20.1, abc and empty, time 4, 241 and empty, and a 301-character memo, one at a time, judging each error before the next; submit at most two valid requests; report validation that is missing or wrong
conditions-revise|ios|skeptic|Sign in as credential owner. From ホーム submit 10 km in 5 minutes, press 条件を変える, and compare every prefilled field with what was submitted; submit at most two requests in total; report fields that are lost, changed, or not prefilled
```

## Gotchas

- The propose button is hidden during `条件を確認しています…` and `コースを作っています…`. Reporting the sheet as missing from that screen is a false failure.
- Empty fields are valid; a blank submit is a successful request. Out-of-range values show red text under the field and keep the sheet open: `距離は0.2〜20kmで入力してください`, `時間は5〜240分で入力してください`. A memo over 300 characters also fails.
- `10` km in `5` minutes always produces `距離と時間の組み合わせが合っていないかもしれません`. `今日のわんちゃんには負担が大きいかもしれません` comes from an LLM check on the memo and is not deterministic.
- The daily cap is 10 requests in a rolling 24 hours per account; retries do not count. The refusal reads `今日の提案は上限（10回）に達しました。明日また試してください` in red under `この条件で提案`, and the sheet stays open. A test or charter that loops submits burns the account's cap.
- Number pads have no return key. Start a dismissing swipe below the mood-chip row, which scrolls horizontally and swallows it.
- `クリア` is disabled while no start point is chosen. `現在地` asks for location itself; `現在地を取得できませんでした` appears when permission is denied or no fix arrives within 5 seconds.
- Only `条件を変える` pre-fills the sheet, and it stays blank until the latest proposal loads. Drag the grabber down to dismiss without submitting. The translucent background is by design.
- Leave `app.json` `androidGoogleMapsApiKey` empty.
