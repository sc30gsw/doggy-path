# Course display

Course display is the Home tab. It follows the latest proposal: an idle call to action, a working indicator, a confirmation step, up to three courses on a map, or a failure with a retry button. The Owner does not type on this screen except to confirm, revise, or retry.

## Sub-features

- `display-idle` shows `今日の散歩コースを提案します` and the propose button. It appears only before the Owner's first request, because Home always follows the latest proposal.
- `display-working` shows a spinner with the check or build line and hides the propose button.
- `display-confirm` shows a warning plus `このまま作る` and `条件を変える`.
- `display-ready` shows a summary card above the map, with distance and time, a reason, the start-point note, and course buttons `1`, `2`, and `3` when that many courses exist.
- `display-failed` shows a failure sentence, a retry button that counts down for 60 seconds, and the text button `コースを提案してもらう`.

## How to get to it (user POV)

- Choose the `ホーム` tab after the dog profile exists.
- Closing the conditions sheet returns here.
- A proposal already in progress is on this screen at the next launch.

## Driving it with verify-doggy-path

Preconditions:

- `verify-doggy-path doctor` reports `worth-driving: yes`.
- The Owner has a saved dog profile.
- Routing keys exist only on the Convex deployment. They are not in the app binary. A missing key surfaces as a failure sentence, which is still a valid `display-failed` proof.

- **Idle.** Open `ホーム` on an account with no proposal yet. Run `verify-doggy-path drive course-display`. The center shows `今日の散歩コースを提案します`, `気分や距離を伝えると、周回コースを最大3つ作ります`, and the button `コースを提案してもらう`.
- **Working.** Submit any conditions sheet. Home shows a spinner with `条件を確認しています…` and then, when the check passes, `コースを作っています…`. The propose button is gone during both lines. Screenshot within a second of the tap, because building often takes only a few seconds.
- **Confirm.** Submit `10` km in `5` minutes. Home shows `距離と時間の組み合わせが合っていないかもしれません` or `今日のわんちゃんには負担が大きいかもしれません`, plus `このまま作る` and `条件を変える`. Press `このまま作る`. The working line `コースを作っています…` appears.
- **Ready.** When courses exist, the card above the map shows a distance ending in `km` and a duration ending in `分`, such as `1.7km・35分`, with a reason line `わんちゃんの体に合っています` or `今日の気分にぴったり` when the order is recommended. The map shows the start pin, the selected loop in green, and the other loops in gray. Press `2`. The button `2` fills blue, the summary changes, and the map refits to the second loop. Tapping a gray loop selects it too. A start-point note may read `現在地から作りました`, `前回の開始地点から作りました`, or `東京駅から作りました`. A start point chosen on the map shows no note.
- **Failed.** When the check or the build fails, Home shows one of `コースを作るサービスに接続できませんでした`, `この開始地点の近くで周回コースが見つかりませんでした`, `時間がかかりすぎたため中断しました`, or `コースを作れませんでした`. The retry button counts down as `N秒後にもう一度試せます` for 60 seconds from the failure and then becomes `もう一度試す`. Retrying restarts at the check.
- **Proof.** Screenshot the working line, then the ready map with a course number selected, or the failure sentence if routing is unavailable. Store them with feature id `course-display`. The pair must show a change caused by the submit or the course button, not only the final frame.

## Gotchas

- Rank order can fall back. The note `おすすめ順ではありません` means the list is by length. That is a successful ready state, and the card then shows only distance and minutes, with no reason line and no unsuitable line.
- The by-length note and the all-unsuitable note never appear together.
- `時間がかかりすぎたため中断しました` appears only after 140 seconds of routing. `コースを作るサービスに接続できませんでした` needs every routing call to be unavailable. `コースを作れませんでした` is any unexpected error.
- A blank Home is the loading state while the proposal query resolves.
- Every course can be a poor fit. The card names the dog, as in `今日のMomoには、どのコースも負担が大きいかもしれません`, and a course can also say `今日は不向きかもしれません`.
- The routing service builds loops even from a pin by the water, so `display-failed` is hard to force. Report it as not driven unless routing is actually unavailable.
- Retry stays disabled until the countdown ends. Pressing it early is not a failed control.
- The map runs under the floating tab bar. Every control sits in the card above the map.
- Do not treat a Metro bundle as a map proof. The map is native.
