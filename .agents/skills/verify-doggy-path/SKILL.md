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
- `.env.local` holds `EXPO_PUBLIC_CONVEX_URL` for a development deployment. Create it with `bunx convex dev` (`CONVEX_AGENT_MODE=anonymous` for a cloud agent). Never `bunx convex deploy`, never print or commit the URL or keys. Keep only `.env.local` in the repo root: Expo pulls every `.env*` file there into the Metro graph, so a copy such as `.env.backup.local` is parsed as JavaScript and its keys appear on the red error screen.
- The Convex CLI is logged into the account that owns `CONVEX_DEPLOYMENT` (`bunx convex login status`). A `CONVEX_DEPLOY_KEY` in `.env.local` overrides the login.
- The dev build is installed on the simulator: `xcrun simctl get_app_container <udid> com.sc30gsw.doggy-path` exits `0`. If not, build it (below). Expo Go is not a target, but a crash only Expo Go shows (the `SwiftUIVirtualViewObjC` abort in `AGENTS.md`) is still a real bug.

### Build the dev client

```bash
LANG=en_US.UTF-8 bunx expo run:ios --device "<simulator name>" --no-bundler
```

`--no-bundler` keeps it from starting a second Metro. The first build generates `ios/` (gitignored, never edited by hand) and takes several minutes. Without the UTF-8 locale `pod install` dies with `Unicode Normalization not appropriate for ASCII-8BIT`; if CocoaPods times out on its CDN, run `pod install` in `ios/` with the same locale and rebuild. Rebuild after any native dependency change.

## Launch

The runner starts the app. `npx e2e run <file>` and an MCP `open_session` both spawn `bunx expo start --host localhost --port 8081` from `app.command`, wait for `http://localhost:8081/status` to answer, launch the dev build with `--initialUrl http://localhost:8081` and the dev menu off, and stop Metro when the run or session ends. Metro's output goes to `.e2e/logs/metro.log`.

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

`list` loads the config and prints every test-target pair without starting anything, so a config error shows here. The smoke test clears the keychain (the Convex Auth token lives there, so the app starts signed out), opens the dev build, and pins the `ログイン` and `アカウントを作る` buttons. Exit `0` means Metro started, the dev build loaded this run's bundle, and the sign-in form rendered. `APP_UNREACHABLE` means Metro never answered: read `.e2e/logs/metro.log`. A red screen means a bundle error: it is in the same log.

The smoke test signs the simulator's app out. That is intended; tell the Owner if their own session lived there.

## Drive

Read [features/README.md](features/README.md), then the feature file. Two lanes:

- **Live over MCP** (topic `mcp`): `open_session` on target `ios`, `call observe`, act with the verbs, `locate` every locator before you write it, `screenshot` or `start_recording` for proof, `close_session` when done. Use it to look at a screen, check a UI change, and learn the accessible names.
- **Scripted** (topic `writing-tests`): a test under `tests/`, `screen` where the label is known, `agent.act` where the flow varies. Import `test`, `describe` and the hooks from `@e2e-dev/mobile`. A test that does not call `app.open()` starts where the previous one left the app.

What this app needs:

- Mobile has no `test.setup` or `session`. A signed-in test signs in itself: fill `メールアドレス` with `credentials.user('owner').username`, fill `パスワード` with the credential's password (a `Secret`), tap `ログイン`. Set `E2E_USER_OWNER_USERNAME` and `E2E_USER_OWNER_PASSWORD` to a disposable account on the development deployment, never the Owner's own. With no such account, hand sign-in to the Owner and continue once Home appears. After a password fill, screenshots are withheld for the rest of that test.
- Labels are Japanese and shown verbatim. Buttons, rows and section titles are SwiftUI (`@expo/ui`): query buttons as `getByRole('button', '<label>')`, text fields by `getByPlaceholder`, footers and messages by `getByText`. Both name fields on the profile form share the placeholder `名前`; scope by section or use `locate` to tell them apart.
- Mood chips are React Native `Pressable`s with role `radio`. The breed rows are `Pressable`s with role `button`. Native tab items `ホーム` and `プロフィール` are not `tab` role on iOS: query them by label or text (topic `setup`, React Native on iOS).
- Prefer `fill`. Typing through the simulator keyboard while the Japanese kana keyboard is active reverses letters (`Taro` becomes `aroT`); that is a harness artifact, not an app bug.
- Number pads have no return key. Dismiss with `dismiss_keyboard` over MCP or by swiping the form outside the horizontal mood-chip row.
- Location prompts: deny unless the proof needs the device location. The app falls back to the previous start point or 東京駅.
- Account flows and course proposals call the Convex deployment. Confirm a saved change from a second read, such as the Profile tab after `app.open()` relaunches the app.

## Evidence

Every run writes `.e2e/report.json`. A failed test gets `.e2e/results/<test>/trace.md` with the screen at failure; `--trace on` pages passing tests too; `--video` records each attempt as MP4; `app.screenshot('<feature>-<state>')` saves a named frame. The next run clears `.e2e/results/`, Doctor included, so keep a proof with `--output .e2e/proof/<feature>` (gitignored). Metro's log is `.e2e/logs/metro.log`. MCP recordings land in `.e2e/videos/<session>/`.

Proof standards:

- Drive the real Owner path, not internal setters or Convex functions called directly.
- Capture the action and the resulting state, not only the final frame: a working line then the ready map, a filled sheet then Home.
- Verify the side effect in its store: a saved profile or a proposal is a row on the Convex deployment. Re-read it through the app after a relaunch, or in the Convex dashboard for that deployment.
- A Metro status page, a bundle download, or a passing `list` is launch evidence, not proof that a screen works.
- When the dev build crashes during mount, nothing reaches Metro. Copy the newest `doggypath` `.ips` from `~/Library/Logs/DiagnosticReports` into the proof directory and read its `lastExceptionBacktrace`.

## Bug bash

Follow topic `bug-bash`. For this app:

- Write an untracked `e2e.bugbash.config.ts` that spreads `e2e.config.ts`, adds `tests/bugbash/**/*.e2e.ts` to `tests`, and declares `agents` with a model (the base config has none, so `agent.*` steps and `e2e explore` need this file) plus the `skeptic` and `fuzzer` personas, each with `maxSteps: 40` and `maxModelCalls: 40`. Keep the `ios` target and its `app.command`.
- Its `context`: labels are Japanese; the app talks to a development Convex deployment; course proposals are capped at 10 per 24 hours per account, so never loop submits; the routing and LLM keys live on the deployment and may be missing, which surfaces as a failure sentence on Home; never sign out; never type into Convex dashboard pages.
- One simulator means one explorer at a time: run the fan-out with `-P 1`, or declare one target per booted simulator, each naming its `device`.
- Signed-in charters sign in as credential `owner` in their goal. Seed one disposable account per signed-in charter on the development deployment (sign up through the app) and declare each as `bb-<slug>`, or the explorers report each other's edits.
- The charters come from the feature files' `Charters` sections. A bug is confirmed only once `tests/bugbash/<slug>.e2e.ts` fails with `ASSERTION_FAILED` on the assertion that encodes it. `.e2e/bugbash/` is gitignored.

## Cleanup

The runner stops the Metro it started; `close_session` stops the one a session started. A Metro the Owner started stays theirs. Never kill by process name. Remove the disposable accounts you seeded, the bug-bash config, and charters whose findings were all rejected. Never delete `.e2e/proof/` or `.e2e/bugbash/` evidence the handover names. The simulator, the installed dev build, and `ios/` stay.

## Helpers

None. The e2e CLI is the helper. The old `verify-doggy-path` shell script (launch, doctor, open, cleanup) was retired when this skill moved onto e2e: `app.command` replaced `launch` and `cleanup`, the smoke test replaced `doctor`, and `launchArguments` replaced `open dev-client`.

## Maintenance

When a route or label changes and a test fails, change the feature file in the same commit. Rerun `/create-verification-skill` when the app grows a feature the map lacks.
