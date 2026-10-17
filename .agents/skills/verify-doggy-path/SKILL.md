---
name: verify-doggy-path
description: Launch and drive the doggy-path Expo app on the iOS Simulator through e2e the way an Owner does, and keep proof. Use when verifying sign-in, the dog profile, course conditions, or the home course map, when a UI change needs to be seen working, or to bug bash the app.
---

# Verify doggy-path

doggy-path is an Expo Router app. The Owner signs in, registers a dog, asks for a walk, and reads ranked loop courses on a map. The surface is the iOS development build (`com.sc30gsw.doggy-path`) on a simulator, driven by `@e2e-dev/mobile`. There is no web UI. Android is not configured yet.

## Read first

Read the e2e skill (`.agents/skills/e2e/SKILL.md`, or `npx e2e guide`) before anything here. This skill drives `e2e.config.ts` (target `ios`) and the `tests/**/*.e2e.ts` glob. The feature map is [features/README.md](features/README.md).

## Host requirements

- macOS with Xcode and an iOS simulator runtime, and `npx agent-device doctor` passing once. A Linux host or cloud container cannot drive this app: there is no simulator, and an EAS hosted simulator cannot reach a Metro on `localhost`. Say so and stop rather than reporting a drive.
- Node.js 24.8+ or 22.22.3+, `bun install` done.
- No Convex login and no `.env.local` are needed for e2e. Every run talks to a local anonymous Convex deployment that `scripts/e2e-stack.ts` creates and owns (Launch, below), never the cloud development deployment. `.env.local` (`EXPO_PUBLIC_CONVEX_URL` for the cloud development deployment, from `bunx convex dev`) is only for running the app by hand with `bun run start`. Never `bunx convex deploy`, never print or commit a URL or key. Keep only `.env.local` in the repo root: Expo pulls every `.env*` file there into the Metro graph, so a copy such as `.env.backup.local` is parsed as JavaScript and its keys appear on the red error screen.
- Course-building proofs need a real `ORS_API_KEY` on the local e2e deployment; see Launch. Without it every build ends in the routing failure.
- The dev build is installed on the simulator: `xcrun simctl get_app_container <udid> com.sc30gsw.doggy-path` exits `0`. If not, build it (below). Expo Go is not a target, but a crash only Expo Go shows (the `SwiftUIVirtualViewObjC` abort in `AGENTS.md`) is still a real bug.

### Build the dev client

```bash
LANG=en_US.UTF-8 bunx expo run:ios --device "<simulator name>" --no-bundler
```

`--no-bundler` keeps it from starting a second Metro. The first build generates `ios/` (gitignored, never edited by hand) and takes several minutes. Without the UTF-8 locale `pod install` dies with `Unicode Normalization not appropriate for ASCII-8BIT`; if CocoaPods times out on its CDN, run `pod install` in `ios/` with the same locale and rebuild. Rebuild after any native dependency change.

- `pod install` refuses the CocoaPods CDN with `Permission bits for '~/.netrc' should be 0600`. Tell the Owner; it is their file.
- iOS 27 aborts any app that has not adopted the scene life cycle (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` in the `.ips`, nothing in Metro's log). `plugins/with-ios-scene-lifecycle.js` adopts it at prebuild. After changing a config plugin, run `LANG=en_US.UTF-8 bunx expo prebuild --platform ios --clean` before the build; `run:ios` keeps an existing `ios/`.
- The first run after a prebuild bundles cold (about 6 s), past the smoke test's 5 s wait. Rerun once before reading it as a failure.

## Launch

The runner starts the app. `npx e2e run <file>` and an MCP `open_session` both spawn `bun scripts/e2e-stack.ts 8081` from `app.command`, wait up to 120 s for `http://localhost:8081/status` to answer, launch the dev build with `--initialUrl http://localhost:8081` and the dev menu off, and stop the stack when the run or session ends. The stack's output (Convex and Metro both) goes to `.e2e/logs/metro.log`.

The stack script, in order:

1. Prepares the local backend (`scripts/e2e-backend.ts`, also runnable alone as `bun run e2e:backend`). It lives in `~/.cache/doggy-path-e2e/<hash>`, where `<hash>` is the first 12 hex digits of the SHA-256 of the checkout's absolute path. It links `package.json` and `node_modules` there, copies `convex/` (a symlinked `convex/` fails the push with `found wrong number of app bundles`), creates an anonymous local deployment on the first run, sets any missing env (`JWT_PRIVATE_KEY` and `JWKS` generated, `SITE_URL`, and the placeholders `ORS_API_KEY` and `TYPESAFE_API_KEY` set to `e2e-invalid-key`), and pushes the functions. Every `CONVEX_*` variable from the project's `.env.local` is stripped, so the cloud deployment is never touched.
2. Runs `convex dev` against that deployment and `expo start --host localhost --port 8081` with `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL` pointed at it. The log line `Metro serves the app against anonymous:<name> at http://127.0.0.1:<port>` names it. When either child exits, the script stops the other.

The local deployment and its accounts persist across runs. Env names already set are left alone, so a real key set once stays:

- `ORS_API_KEY` set to `e2e-invalid-key` makes every routing call unavailable, so every build ends in `コースを作るサービスに接続できませんでした`. The tests that wait for course button `1` need a real key: with a session open (the local backend must be up), run `CONVEX_AGENT_MODE=anonymous bunx convex env set ORS_API_KEY <key>` from the backend directory, whose own `.env.local` names the deployment. Ask the Owner for the key; never print it.
- `TYPESAFE_API_KEY` set to `e2e-invalid-key` sends the condition check to its deterministic fallback (`judgedBy: 'fallback'`), so no LLM warning ever appears. A real key brings back the LLM load check, which can judge a long walk too much for the onboarding dog (born this month by default).

- Port 8081 is fixed and `reuseExisting` is off. Another Metro on 8081 (a `bun run start` in a terminal) fails the run with `APP_ALREADY_RUNNING`. That is the guard: ask its owner to stop it, never kill it. One doggy-path Metro per machine.
- `NODE_OPTIONS=--dns-result-order=ipv4first` in `app.command.env` is load-bearing. Without it Metro listens only on `::1`, the manifest still hands the client `127.0.0.1`, and the client shows "Could not connect to development server".
- `CI=1` turns off file watching. A new run bundles the current source; a live MCP session does not pick up edits, so `close_session` and `open_session` after an edit.
- One simulator is the whole pool (`workers: 1`). With several booted, set `DOGGY_PATH_DEVICE` to the name `npx agent-device devices` lists. Never run a shell `e2e run` while an MCP session holds the simulator: close the session first.

## Doctor

Run this first, and whenever anything looks off:

```bash
npx e2e list
npx e2e run tests/smoke.e2e.ts
```

`list` loads the config and prints every test-target pair without starting anything, so a config error shows here. The smoke test clears the keychain (the Convex Auth token lives there, so the app starts signed out), opens the dev build, and pins the `ログイン` and `アカウントを作る` buttons. Exit `0` means the local backend took the push, Metro started, the dev build loaded this run's bundle, and the sign-in form rendered. `APP_UNREACHABLE` means Metro never answered: read `.e2e/logs/metro.log`. A `convex ... failed` error in that log is the backend, not Metro; `bun run e2e:backend` reproduces it without the simulator. A red screen means a bundle error: it is in the same log.

The smoke test signs the simulator's app out. That is intended; tell the Owner if their own session lived there.

## Drive

Read [features/README.md](features/README.md), then the feature file. Two lanes:

- **Live over MCP** (topic `mcp`): `open_session` on target `ios`, `call observe`, act with the verbs, `locate` every locator before you write it, `screenshot` or `start_recording` for proof, `close_session` when done. Use it to look at a screen, check a UI change, and learn the accessible names.
- **Scripted** (topic `writing-tests`): a test under `tests/`, `screen` where the label is known, `agent.act` where the flow varies. Import `test`, `describe` and the hooks from `@e2e-dev/mobile`. A test that does not call `app.open()` starts where the previous one left the app.

What this app needs:

- Mobile has no `test.setup` or `session`. Each signed-in `describe` is `{ serial: true }`: its first test clears the keychain, opens the app, and signs up a fresh `owner-<uuid>@example.com` account with `signUpThroughOnboarding` from `tests/support/owner.ts`; the later tests continue from where it left the app. Reuse those helpers (`signUpNewOwner`, `completeOnboarding`, `enterTargets`, `submitConditions`, `expectCoursesBuilt`, `waitForConfirmationOrCourses`) and the typed target fixtures there rather than repeating the steps.
- iOS offers to save the new password right after sign-up; an Owner declines with `今はしない`. A tap while that sheet slides in is ignored, which is why `signUpNewOwner` polls until `はじめる` is back.
- The config's `credentials.owner` (`E2E_USER_OWNER_USERNAME`, `E2E_USER_OWNER_PASSWORD`) is for bug-bash charters and live sign-ins, not the tests. It must be an account on the local e2e deployment: sign it up through the app once. After a password fill, screenshots are withheld for the rest of that test.
- Labels are Japanese and shown verbatim. Buttons, rows and section titles are SwiftUI (`@expo/ui`): query buttons as `getByRole('button', '<label>')`, text fields by `getByPlaceholder`, footers and messages by `getByText`. Both name fields on the profile form share the placeholder `名前`; scope by section or use `locate` to tell them apart.
- Mood chips are React Native `Pressable`s with role `radio`. The breed rows are `Pressable`s with role `button`. Native tab items `ホーム` and `プロフィール` are not `tab` role on iOS: query them by label or text (topic `setup`, React Native on iOS).
- Prefer `fill` for text fields. Typing through the simulator keyboard while the Japanese kana keyboard is active reverses letters (`Taro` becomes `aroT`); that is a harness artifact, not an app bug.
- Number pads (`距離 (km)`, `時間 (分)`, `体重 (kg)`) cannot confirm a `fill` and have no return key. `clear()`, `pressSequentially(...)`, then `device.dismissKeyboard()` (`dismiss_keyboard` over MCP) before the next field.
- The runner cannot clear the multiline `メモ`. Edit another field to prove a save.
- The conditions sheet ignores synthesized scrolls. Tapping `時間 (分)` scrolls the list so `この条件で提案` sits above the keyboard and stays there once the pad closes (`submitConditions`). Forms on the tabs scroll normally with `scrollUntilVisible`.
- Pickers are menus: the sex row is a button labeled with its value (`選択` until chosen); tap it, then `オス` or `メス`.
- The config denies location (`permissions: { location: 'deny' }`), so no prompt appears and the start point falls back to the previous one or 東京駅 (`東京駅から作りました` on the ready card).
- Account flows and course proposals call the local e2e deployment. Confirm a saved change from a second read, such as the Profile tab after `app.open()` relaunches the app.
- Matchers wait 15 s (`assertionTimeout`). A test that waits for a build passes `COURSE_BUILD_TEST` (240 s) from `tests/support/owner.ts`; the runner's default would cut it off mid-build.

## Evidence

Every run writes `.e2e/report.json`. A failed test gets `.e2e/results/<test>/trace.md` with the screen at failure; `--trace on` pages passing tests too; `--video` records each attempt as MP4; `app.screenshot('<feature>-<state>')` saves a named frame. The next run clears `.e2e/results/`, Doctor included, so keep a proof with `--output .e2e/proof/<feature>` (gitignored). Metro's log is `.e2e/logs/metro.log`. MCP recordings land in `.e2e/videos/<session>/`.

Proof standards:

- Drive the real Owner path, not internal setters or Convex functions called directly.
- Capture the action and the resulting state, not only the final frame: a working line then the ready map, a filled sheet then Home.
- Verify the side effect in its store: a saved profile or a proposal is a row on the local e2e deployment. Re-read it through the app after a relaunch. The functions' own logs (`jevFailed`, routing errors) are in `.e2e/logs/metro.log` through `convex dev --tail-logs always`.
- A Metro status page, a bundle download, or a passing `list` is launch evidence, not proof that a screen works.
- When the dev build crashes during mount, nothing reaches Metro. Copy the newest `doggypath` `.ips` from `~/Library/Logs/DiagnosticReports` into the proof directory and read its `lastExceptionBacktrace`.

## Bug bash

Follow topic `bug-bash`. For this app:

- Write an untracked `e2e.bugbash.config.ts` that spreads `e2e.config.ts`, adds `tests/bugbash/**/*.e2e.ts` to `tests`, and declares `agents` with a model (the base config has none, so `agent.*` steps and `e2e explore` need this file) plus the `skeptic` and `fuzzer` personas, each with `maxSteps: 40` and `maxModelCalls: 40`. Keep the `ios` target and its `app.command`.
- Its `context`: labels are Japanese; the app talks to a local Convex deployment; course proposals are capped at 10 per 24 hours per account, so never loop submits; the routing and LLM keys may be the `e2e-invalid-key` placeholders, which surfaces as the routing failure sentence on Home and no LLM warnings; never sign out; never type into Convex dashboard pages.
- One simulator means one explorer at a time: run the fan-out with `-P 1`, or declare one target per booted simulator, each naming its `device`.
- Signed-in charters sign in as credential `owner` in their goal. Seed one account per signed-in charter on the local e2e deployment (sign up and finish onboarding through the app) and declare each as `bb-<slug>`, or the explorers report each other's edits. Accounts persist with the deployment, so seed once.
- The charters come from the feature files' `Charters` sections. A bug is confirmed only once `tests/bugbash/<slug>.e2e.ts` fails with `ASSERTION_FAILED` on the assertion that encodes it. `.e2e/bugbash/` is gitignored.

## Cleanup

The runner stops the stack it started and the stack stops both Convex and Metro; `close_session` does the same for a session. A Metro the Owner started stays theirs. Never kill by process name. Remove the bug-bash config and charters whose findings were all rejected. Never delete `.e2e/proof/` or `.e2e/bugbash/` evidence the handover names. The simulator, the installed dev build, `ios/`, and the local e2e deployment in `~/.cache/doggy-path-e2e/<hash>` stay. Every test run signs up new accounts there; to start from an empty backend, delete that directory with nothing running. The next run recreates it with placeholder keys, so a real `ORS_API_KEY` must be set again.

## Helpers

The e2e CLI is the main helper. `scripts/e2e-stack.ts` is the target's `app.command` and is not run by hand; `bun run e2e:backend` prepares and pushes the local backend alone, to debug a backend failure without the simulator. `tests/support/owner.ts` holds the shared Owner steps and fixtures. The old `verify-doggy-path` shell script (launch, doctor, open, cleanup) was retired when this skill moved onto e2e: `app.command` replaced `launch` and `cleanup`, the smoke test replaced `doctor`, and `launchArguments` replaced `open dev-client`.

## Maintenance

When a route or label changes and a test fails, change the feature file in the same commit. Rerun `/create-verification-skill` when the app grows a feature the map lacks.
