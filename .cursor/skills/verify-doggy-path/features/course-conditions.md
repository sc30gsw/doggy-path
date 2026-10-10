# Course conditions

Course conditions is the sheet where the Owner describes today's walk. Mood, today's memo, target distance, target time, and start point may all be left empty. Submitting asks for a proposal and closes the sheet back to Home.

## Sub-features

- `conditions-open` opens a blank sheet from Home.
- `conditions-empty` submits with every field empty.
- `conditions-filled` submits a mood, a memo, a distance, a time, and a start point.
- `conditions-revise` reopens the sheet with the current proposal's conditions filled in.

## How to get to it (user POV)

- On Home, press `コースを提案してもらう`. The button is absent while a proposal is still running.
- When Home is asking for confirmation, press `条件を変える`. The sheet opens with the previous conditions.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- The Owner is signed in and a dog profile is saved, so Home is visible.
- Home is not in the working phase. The button `コースを提案してもらう` is on screen.
- A development build is installed when the proof includes the start-point map. `react-native-maps` is not part of Expo Go.

- **Open a blank sheet.** On Home, press `コースを提案してもらう`. Run `verify-doggy-path drive course-conditions`. The sheet shows section `今日の気分` and section `目安`, mood chips `のんびり`, `元気いっぱい`, `冒険したい`, `疲れ気味`, and `気分転換`, placeholders `今日のメモ`, `距離 (km)`, and `時間 (分)`, and the button `この条件で提案`.
- **Submit empty.** Press `この条件で提案` without typing. The sheet closes. Home shows `条件を確認しています…` or, after the check, either a confirmation, a failure, or `コースを作っています…`.
- **Submit a filled sheet.** When Home shows `コースを提案してもらう` again, open the sheet. Select `のんびり`. Enter `公園` in `今日のメモ`, `2` in `距離 (km)`, and `30` in `時間 (分)`. Press `現在地`. Either the map gains a marker or the text `現在地を取得できませんでした` appears. If location is denied, long-press the map to drop a pin, or press `クリア` and leave the start empty. The hint `未指定のときは現在地 → 前回の開始地点 → 東京駅 の順に使います` is visible while the start point is empty. Press `この条件で提案`. The sheet closes and Home leaves the idle state.
- **Revise.** When Home shows `条件を変える`, press it. The memo field still contains the text from the running proposal. Change the memo, press `この条件で提案`, and confirm the sheet closes.
- **Proof.** Screenshot the filled sheet before submit and Home immediately after the sheet closes. Store them with feature id `course-conditions`. A second proof is Home's working or confirmation copy, which shows the request was accepted.

## Gotchas

- The propose button is hidden during `条件を確認しています…` and `コースを作っています…`. Waiting on that screen and then reporting the sheet as missing is a false failure.
- Empty fields are valid. A blank submit is a successful request, not a validation error.
- The daily cap refusal reads `今日の提案は上限（10回）に達しました。明日また試してください`. That line stays on the sheet.
- `条件を変える` is the only entry that pre-fills the sheet. The Home button opens an empty draft.
- Location permission copy is `現在地から散歩コースを作るために使用します。`
- Do not put a Google Maps key into `app.json` for this proof. An empty Android key is the committed configuration. The iOS map still needs a development build.
