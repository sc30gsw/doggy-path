---
name: verify-doggy-path
description: Launch and drive the doggy-path Expo app on the iOS Simulator the way an Owner does, and capture proof. Use when verifying sign-in, the dog profile, course conditions, or the home course map, or when a UI change needs to be seen working.
---

# Verify doggy-path

doggy-path is an Expo Router app for iOS and Android. The Owner signs in, registers a dog, asks for a walk, and reads ranked loop courses on a map. The primary surface is the iOS app on a simulator. There is no web UI and no in-repo Maestro or Detox harness. Taps, typing and screenshots go through the simulator control tool (`mcp__Claude_Code_iOS_Simulator__control` in Claude Code, or `xcrun simctl` plus your own input tool elsewhere).

The helper is `.cursor/skills/verify-doggy-path/scripts/verify-doggy-path`. Call it by that path from the repo root. It starts one Metro, builds and opens the clients, records evidence outside the repo, and stops only the session it started.

Keep proof under `/tmp/doggy-path-verify/<run-id>/` unless `DOG_PATH_EVIDENCE_ROOT` says otherwise. Cleanup never deletes that directory.

## Launch

From the repo root, with dependencies installed (`bun install`):

```bash
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path launch
```

`launch` assigns `DOG_PATH_RUN_ID` when it is unset and starts Metro in a tmux session named `doggy-path-verify-<run-id>`. The command is `CI=1 EXPO_NO_TELEMETRY=1 NODE_OPTIONS=--dns-result-order=ipv4first bunx expo start --host localhost --port 8081` (override the port with `DOG_PATH_PORT`). On this environment the tmux binary is invoked with `-f /exec-daemon/tmux.portal.conf` when that file exists.

Ready means `http://localhost:8081/status` returns `packager-status:running` and `launch.txt` says `ready:`. The pane log is `launch.log`.

`NODE_OPTIONS=--dns-result-order=ipv4first` is load-bearing. Without it Node resolves `localhost` to `::1`, Metro listens only on IPv6, and the manifest still hands the client `http://127.0.0.1:8081/...` as the bundle URL. Expo Go and the dev client then show "Could not connect to development server".

`launch` refuses, exits 1, and leaves `latest` pointing at the previous run when anything already listens on port 8081 (`lsof` and the status URL are both checked). One doggy-path Metro per machine. Another `expo start` (for example `bun run start` in a terminal) on the same port makes the client attach to whichever answers. Ask its owner to stop it rather than killing it.

`CI=1` turns off file watching. After every source edit run `verify-doggy-path restart`, then reopen the client with `open`. A client that stays open keeps the old bundle.

`.env.local` must already contain `EXPO_PUBLIC_CONVEX_URL`. Expo loads that file. Create it with `bunx convex dev` against a development deployment (`CONVEX_AGENT_MODE=anonymous` for a cloud agent). Never `bunx convex deploy`. Never commit `.env.local` or API keys. Leave `app.json` `androidGoogleMapsApiKey` empty.

## Doctor

```bash
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path doctor
```

Doctor reads the run in `/tmp/doggy-path-verify/latest` (or `DOG_PATH_RUN_ID`) and writes `doctor.txt` plus `surface.txt`. It records:

- whether this run's Metro status URL answers, and every process listening on the port
- whether the tmux session in `state.env` still exists
- whether `EXPO_PUBLIC_CONVEX_URL` is non-empty in `.env.local` (the value is not printed)
- `target-udid`, every booted simulator, and whether the dev client (`com.sc30gsw.doggy-path`) and Expo Go are installed on the target
- the HTTP status and byte count of a dev iOS bundle request (the body is discarded)

Exit 0 means Metro is up and the Convex URL is set. `worth-driving: yes` means a simulator is booted. Run doctor before every drive.

More than one simulator can be booted. Always pass the `target-udid` from `surface.txt` to the simulator tool and to `xcrun simctl`. Never use `booted`, which picks an arbitrary device. Set `DOG_PATH_SIM_UDID` to choose a different one.

## Clients

```bash
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path build-ios
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path open dev-client
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path open expo-go
```

The development build is the primary client. `build-ios` runs `bunx expo run:ios --device <udid> --no-bundler` with `LANG=en_US.UTF-8`, so it never starts a second Metro, and writes `build-ios.log`. A first build generates `ios/` (gitignored, never edited by hand) and takes several minutes. Without the UTF-8 locale `pod install` dies with `Unicode Normalization not appropriate for ASCII-8BIT`. If CocoaPods times out on its CDN, run `pod install` in `ios/` with the same locale and run `build-ios` again. Rebuild after any native dependency change.

`open` terminates the client first, so it always loads a fresh bundle, then opens `http://localhost:<port>` in it. Expo Go also runs this app, maps included. Treat a crash that only Expo Go shows as a real bug until a dev build proves otherwise.

## Drive

Read `features/README.md`, then the feature file.

```bash
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path drive <feature>
```

`<feature>` is `sign-in`, `dog-profile`, `course-conditions`, or `course-display`. The helper runs doctor first. `result: blocked` (exit 2) means no simulator surface, which is a failed drive. `result: surface-ready` (exit 3) means continue on the target simulator with the feature file. The helper does not tap the screen.

Driving rules that every feature shares:

- Take a fresh screenshot before every tap. Screenshots can lag the screen by about a second. Wait a second after a tap or a swipe, and screenshot again before trusting a layout.
- Coordinates are device points (402 x 874 on iPhone 17). The keyboard and the conditions sheet move the rows, so recompute positions from the latest screenshot.
- Before typing with the simulator tool, switch the keyboard to English with the globe key. Typed letters fed into the Japanese kana keyboard come out reversed (`Taro` becomes `aroT`). Real kana key taps work, so this is a harness artifact, not an app bug.
- Number pads have no return key. Dismiss the keyboard by scrolling the form, starting the swipe outside the horizontal mood-chip row.
- Answer location prompts with `許可しない` unless the proof needs the device location. The app falls back to the previous start point or 東京駅.
- Never type a password into sign-in. Sign-in, sign-up and sign-out of a real account talk to the Convex deployment, so hand those steps to the Owner and continue once the screen they produce appears. Client-side validation (a short password, a malformed email) sends nothing and is safe to drive.

Account flows call the Convex deployment named by `EXPO_PUBLIC_CONVEX_URL`. Confirm a mutation from a second read, such as the Profile tab after a cold relaunch, before calling it proven.

## Evidence

Each run directory contains:

- `state.env` with the tmux session name, port and repo root
- `launch.txt`, `launch.log`, `metro-status.txt`
- `doctor.txt`, `surface.txt`
- `drive-<feature>.txt`
- `build-ios.log` when `build-ios` ran
- `cleanup.txt` after teardown
- screenshots named `<feature>_<entry>_<nn>-<state>.png`, and crash reports copied from `~/Library/Logs/DiagnosticReports`

A proof shows the user action and the resulting state. A Metro status page or a bundle byte count is launch evidence, not proof that a screen works. When a client crashes, copy the newest `.ips` for `Expo Go` or `doggypath` into the run directory and read its `lastExceptionBacktrace`. Crashes during mount do not reach the Metro log.

## Cleanup

```bash
.cursor/skills/verify-doggy-path/scripts/verify-doggy-path cleanup
```

Cleanup kills the tmux session named in that run's `state.env` and writes `cleanup.txt`. It does not touch other Metro processes, the simulator, the installed clients, or the evidence directory.

## Helpers

`scripts/verify-doggy-path` is the only helper and is executable. Subcommands are `launch`, `restart`, `doctor`, `build-ios`, `open <dev-client|expo-go>`, `drive <feature>` and `cleanup`.

The canonical copy lives in `.cursor/skills/verify-doggy-path/`. `.claude/skills/verify/` exposes the same skill to Claude Code under the name `verify`. Its `scripts` and `features` are symlinks into the canonical directory, and its `SKILL.md` body is identical to this one, so every command above uses the canonical path. Only the frontmatter `name` differs. Edit both `SKILL.md` files in the same change.

## Maintenance

When the screens change, run `/maintain-verification-skill` so the feature map stays aligned with the app. Suggest a cadence only if someone asks.
