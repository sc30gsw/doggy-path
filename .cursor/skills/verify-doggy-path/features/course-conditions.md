# Course conditions

Course conditions is the sheet where the Owner describes today's walk. Mood, today's memo, target distance, target time, and start point may all be left empty. Submitting asks for a proposal and closes the sheet back to Home.

## Sub-features

- `conditions-open` opens a blank sheet from Home.
- `conditions-empty` submits with every field empty.
- `conditions-filled` submits a mood, a memo, a distance, a time, and a start point.
- `conditions-revise` reopens the sheet with the current proposal's conditions filled in.

## How to get to it (user POV)

- On Home, press `コースを提案してもらう`. It is the centered button when nothing is proposed, and the text button on the right of the course numbers when courses are shown. It is absent while a proposal is still running.
- When Home is asking for confirmation, press `条件を変える`. The sheet opens with the previous conditions.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- The Owner is signed in and a dog profile is saved, so Home is visible.
- Home is not in the working phase. The button `コースを提案してもらう` is on screen.

- **Open a blank sheet.** On Home, press `コースを提案してもらう`. Run `verify-doggy-path drive course-conditions`. The sheet shows the groups `今日の気分`, `目安`, and `開始地点`. Mood chips `のんびり`, `元気いっぱい`, `冒険したい`, `疲れ気味`, and `気分転換` scroll horizontally. Placeholders `今日のメモ`, `距離 (km)`, and `時間 (分)` are visible. `開始地点` shows a map, the buttons `現在地` and `クリア`, and the footer `未指定のときは現在地 → 前回の開始地点 → 東京駅 の順に使います`.
- **Submit empty.** Scroll to the last group and press `この条件で提案`. Answer the location prompt with `許可しない`. The sheet closes. Home shows `条件を確認しています…`, then a confirmation, a failure, or `コースを作っています…`.
- **Submit a filled sheet.** When Home shows `コースを提案してもらう` again, open the sheet. Tap `のんびり`. It turns blue. Switch the keyboard to English and type `park` into `今日のメモ`, `2` into `距離 (km)`, and `30` into `時間 (分)`. Scroll the form to dismiss the number pad. Long-press the map to drop a pin, or press `現在地`. A pin appears and the start-point footer disappears. `現在地を取得できませんでした` appears when location is denied. Press `この条件で提案`. The sheet closes and Home leaves the idle state.
- **Revise.** Submit `10` km in `5` minutes so Home asks for confirmation, then press `条件を変える`. The sheet opens with `10` and `5` filled in. Change a field, press `この条件で提案`, and confirm the sheet closes.
- **Proof.** Screenshot the filled sheet before submit and Home immediately after the sheet closes. Store them with feature id `course-conditions`. A second proof is Home's working or confirmation copy, which shows the request was accepted.

## Gotchas

- The propose button is hidden during `条件を確認しています…` and `コースを作っています…`. Waiting on that screen and then reporting the sheet as missing is a false failure.
- Empty fields are valid. A blank submit is a successful request, not a validation error.
- Number pads have no return key. Start the dismissing swipe below the mood-chip row, which scrolls horizontally and swallows the gesture.
- `クリア` is disabled while no start point is chosen.
- The daily cap refusal reads `今日の提案は上限（10回）に達しました。明日また試してください`. It appears in the footer under `この条件で提案`, and the sheet stays open.
- `条件を変える` is the only entry that pre-fills the sheet. The Home button opens an empty draft.
- The sheet background is translucent by design, so Home shows through the rows.
- Location permission copy in the dev client is `現在地から散歩コースを作るために使用します。`. Expo Go shows its own English copy.
- Do not put a Google Maps key into `app.json` for this proof. An empty Android key is the committed configuration.
