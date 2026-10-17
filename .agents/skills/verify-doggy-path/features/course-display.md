# Course display

Course display is the Home tab. It follows the latest proposal: an idle call to action, a working indicator, a confirmation step, up to three courses on a map, or a failure with a retry button. The Owner does not type here except to confirm, revise, or retry.

## Sub-features

- `display-idle` shows `今日の散歩コースを提案します` and the propose button, only before the account's first request.
- `display-working` shows a spinner with the check or build line and hides the propose button.
- `display-confirm` shows a warning plus `このまま作る` and `条件を変える`.
- `display-ready` shows a summary card above the map with distance and time, a reason, the start-point note, and course buttons `1`, `2`, `3` when that many courses exist.
- `display-failed` shows a failure sentence, a retry button that counts down for 60 seconds, and the text button `コースを提案してもらう`.

## How to get to it (user POV)

- The `ホーム` tab, signed in with a saved profile. Closing the conditions sheet returns here. A proposal in progress is here at the next launch.

## Driving it with e2e

- Test: `tests/course-display.e2e.ts`, serial on one fresh account. It pins `display-idle`, `display-confirm` (10 km in 5 minutes shows the pace warning, `このまま作る` and `条件を変える`, and hides the propose button), `conditions-revise`, `display-ready` (`このまま作る` shows the working line, then course `1`, a summary matching `/km・\d+分$/`, and `東京駅から作りました`), a second course number (skipped when only one course was built), and a realistic 10 km in 150 minutes walk that raises no pace warning and builds courses, proceeding through `このまま作る` when the LLM load check asks. `display-working` is the first half of `expectCoursesBuilt`. `display-failed` has no test.
- Build waits use `expectCoursesBuilt` and `waitForConfirmationOrCourses` from `tests/support/owner.ts` (150 s for course `1`), inside a test that passes `COURSE_BUILD_TEST`. Every build test needs a real `ORS_API_KEY` (SKILL.md, Launch).
- Locators: `getByText('今日の散歩コースを提案します')`, `getByText('条件を確認しています…')`, `getByText('コースを作っています…')`, `getByRole('button', 'このまま作る')`, `getByRole('button', '条件を変える')`, `getByRole('button', '1')` through `'3'`, `getByRole('button', 'もう一度試す')`.
- Live walk: submit a sheet, `screenshot` within a second (building is often fast), wait for courses, `tap` `2`, `screenshot`.

## Proof

- The working line, then the ready card with a course selected; or the failure sentence when routing is unavailable. The pair must show a change caused by the submit or the course button, not only the final frame.
- Ready: the card shows a distance ending in `km` and a time ending in `分` (`1.7km・35分`; match it with a pattern, the rounding changes), the start-point note (`東京駅から作りました` with location denied), and a reason `わんちゃんの体に合っています` or `今日の気分にぴったり` when the order is recommended. Pressing `2` fills it blue, changes the summary, and refits the map.
- The proposal row on the local e2e deployment carries the same courses.

## Charters

```
display-courses|ios|skeptic|Sign in as credential owner. On ホーム, if courses are shown, select each course number and compare the summary card's distance, time and notes with the map and with each other; submit at most one new request; report numbers or notes that contradict each other
display-states|ios|default|Sign in as credential owner. From ホーム submit 10 km in 5 minutes, then press このまま作る, and follow Home through every state until courses or a failure appear; submit at most two requests; report a state that is blank, stuck, or shows a control it should hide
```

## Gotchas

- Rank order can fall back: `おすすめ順ではありません` means the list is by length, a successful ready state with only distance and minutes. It never appears with the all-unsuitable note.
- Every course can be a poor fit: the card names the dog, as in `今日のMomoには、どのコースも負担が大きいかもしれません`, and a course can say `今日は不向きかもしれません`.
- Failure sentences: `コースを作るサービスに接続できませんでした` (every routing call unavailable), `この開始地点の近くで周回コースが見つかりませんでした`, `時間がかかりすぎたため中断しました` (after 140 seconds), `コースを作れませんでした` (anything unexpected). With a real key the routing service builds loops even from a pin by the water. The way to force `display-failed` is the `e2e-invalid-key` placeholder for `ORS_API_KEY` on the local e2e deployment, which a fresh deployment has: every build then ends in `コースを作るサービスに接続できませんでした`.
- The retry button reads `N秒後にもう一度試せます` for 60 seconds, then `もう一度試す`. Pressing it early is not a failed control. Retrying restarts at the check.
- Routing keys live only on the Convex deployment. A missing or placeholder key surfaces as a failure sentence, which is a valid `display-failed` proof and a false failure for every build test.
- With a real `TYPESAFE_API_KEY` the load check can answer before the working line ever shows and ask for confirmation on a 10 km walk for the newborn onboarding dog. That is the LLM, not the pace check; the Owner proceeds with `このまま作る`.
- A blank Home is the loading state while the proposal query resolves. The map runs under the floating tab bar; every control is in the card. The map is native: a bundle download is not a map proof.
