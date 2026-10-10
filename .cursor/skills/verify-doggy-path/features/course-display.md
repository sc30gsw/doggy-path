# Course display

Course display is the Home tab. It follows the latest proposal: a working line, a confirmation step, up to three courses on a map, or a failure with a retry button. The Owner does not type on this screen except to confirm, revise, or retry.

## Sub-features

- `display-idle` shows the propose button when nothing is in progress.
- `display-working` shows the check and build lines and hides the propose button.
- `display-confirm` shows a warning plus `このまま作る` and `条件を変える`.
- `display-ready` shows the map, the distance and time, and course buttons `1`, `2`, and `3` when that many courses exist.
- `display-failed` shows a failure sentence and `もう一度試す` after the wait.

## How to get to it (user POV)

- Choose the `ホーム` tab after the dog profile exists.
- Closing the conditions sheet returns here.
- A proposal already in progress is on this screen at the next launch.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- A development build with `react-native-maps` is installed for `display-ready`. Expo Go cannot draw this map.
- The Owner has a saved dog profile.
- Routing keys exist only on the Convex deployment. They are not in the app binary. A missing key surfaces as a failure sentence, which is still a valid `display-failed` proof.

- **Idle.** Open `ホーム`. Run `verify-doggy-path drive course-display`. The button `コースを提案してもらう` is visible when no proposal is running.
- **Working.** Submit any conditions sheet. Home shows `条件を確認しています…` and then, when the check passes, `コースを作っています…`. The propose button is gone during both lines.
- **Confirm.** When the check wants a decision, Home shows one of `距離と時間の組み合わせが合っていないかもしれません` or `今日のわんちゃんには負担が大きいかもしれません`, plus `このまま作る` and `条件を変える`. Press `このまま作る`. The working line `コースを作っています…` appears.
- **Ready.** When courses exist, the map shows the start and the selected loop. The summary includes a distance ending in `km` and a duration ending in `分`. Reason lines are `わんちゃんの体に合っています` or `今日の気分にぴったり`. Press `2` when that button exists. The summary changes to the second course. A start-point note may read `現在地から作りました`, `前回の開始地点から作りました`, or `東京駅から作りました`.
- **Failed.** When no course is built, Home shows one of `コースを作るサービスに接続できませんでした`, `この開始地点の近くで周回コースが見つかりませんでした`, `時間がかかりすぎたため中断しました`, or `コースを作れませんでした`. The retry control counts down as `秒後にもう一度試せます` and then becomes `もう一度試す`.
- **Proof.** Screenshot the working line, then screenshot the ready map with a course number selected, or the failure sentence if routing is unavailable. Store them with feature id `course-display`. The pair must show a change caused by the submit or the course button, not only the final frame.

## Gotchas

- Rank order can fall back. The line `おすすめ順ではありません` means the list is by length. That is a successful ready state.
- Every course can be a poor fit. The notice names the dog: `今日の<dog name>には、どのコースも負担が大きいかもしれません`, and a course can also say `今日は不向きかもしれません`.
- Course buttons are the digits `1`, `2`, and `3`. They are easy to miss under the map.
- Retry stays disabled until the countdown ends. Pressing it early is not a failed control.
- Do not treat a Metro bundle as a map proof. The map is native.
