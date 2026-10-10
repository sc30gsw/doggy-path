---
name: verify-doggy-path
description: Launch and drive the doggy-path Expo app (iOS and Android) the way an Owner does, and capture proof. Use when verifying sign-in, the dog profile, course conditions, or the home course map.
---

# Verify doggy-path

doggy-path is an Expo Router app for iOS and Android. The Owner signs in, registers a dog, asks for a walk, and reads ranked loop courses on a map. The primary surface is the native app. There is no web UI and no in-repo browser or Maestro harness.

The helper is `.cursor/skills/verify-doggy-path/scripts/verify-doggy-path`. Invoke it as `verify-doggy-path` after putting that `scripts` directory on `PATH`, or call the script by its path from the repo root. It starts one Metro, records evidence outside the repo, and stops only the session it started.

Keep proof under `/tmp/doggy-path-verify/<run-id>/` unless `DOG_PATH_EVIDENCE_ROOT` says otherwise. Cleanup never deletes that directory.

## Launch

From the repo root, with dependencies already installed (`bun install`):

```bash
export PATH="$PWD/.cursor/skills/verify-doggy-path/scripts:$PATH"
verify-doggy-path launch
```

`launch` assigns `DOG_PATH_RUN_ID` when it is unset, writes it to `/tmp/doggy-path-verify/latest`, and starts Metro in a tmux session named `doggy-path-verify-<run-id>`. The command is `CI=1 EXPO_NO_TELEMETRY=1 bunx expo start --host localhost --port 8081` (override the port with `DOG_PATH_PORT`). On this environment the tmux binary is invoked with `-f /exec-daemon/tmux.portal.conf` when that file exists.

Ready means `http://localhost:8081/status` returns a body that contains `packager-status:running`, and `launch.txt` in the evidence directory says `ready:`. The pane log is `launch.log`. `expo start --host localhost` listens on the IPv6 loopback (`::1`). Use `localhost` in every URL. `127.0.0.1` does not connect.

`.env.local` must already contain `EXPO_PUBLIC_CONVEX_URL`. Expo loads that file. Create it with `bunx convex dev` against a development deployment (`CONVEX_AGENT_MODE=anonymous` for a cloud agent). Never `bunx convex deploy`. Never commit `.env.local` or API keys. Leave `app.json` `androidGoogleMapsApiKey` empty.

`launch` exits 1 when port 8081 is already serving Metro. One doggy-path Metro per machine. Do not start a second one against the same Convex deployment.

## Doctor

```bash
verify-doggy-path doctor
```

Doctor reads the run recorded in `/tmp/doggy-path-verify/latest` (or `DOG_PATH_RUN_ID`) and writes `doctor.txt` plus `surface.txt`. It checks:

- The Metro status URL for this run's port answers.
- The tmux session named in `state.env` still exists.
- `EXPO_PUBLIC_CONVEX_URL` is non-empty in `.env.local`. The value is not printed.
- An iOS Simulator is booted (`xcrun simctl list devices booted`) or `adb devices` lists a row in the `device` state.
- A dev iOS bundle request to Metro returns HTTP 200. The bundle body is discarded after the status and byte count are recorded.

Exit 0 means Metro is up and the Convex URL is set. `worth-driving: yes` in `surface.txt` means a native surface is attached. `worth-driving: no` means the packager may be healthy and the UI still cannot be driven. Run doctor before every drive.

## Drive

Read `features/README.md`, then the feature file. The helper command is:

```bash
verify-doggy-path drive <feature>
```

`<feature>` is `sign-in`, `dog-profile`, `course-conditions`, or `course-display`.

The helper runs doctor first. When `worth-driving: no`, it writes `drive-<feature>.txt` with `result: blocked` and exits 2. That is a failed drive. Do not mark the feature verified.

When a surface is attached, the helper exits 3 with `result: surface-ready`. It does not tap the screen. Continue with the feature file: open the dev client or Expo Go on that surface at `exp://localhost:8081`, then use the quoted Japanese labels. Save a screenshot of the action and of the resulting screen into the evidence directory. Sign-in and the dog profile can use Expo Go when the Go build matches Expo SDK 57 and includes `expo-secure-store`. The conditions sheet map and the home course map use `react-native-maps`, which needs a development build (`bunx expo run:ios`, `bunx expo run:android`, or `eas build --profile development`). This repo has no checked-in `ios/` or `android/` project.

Account flows call the Convex deployment named by `EXPO_PUBLIC_CONVEX_URL`. A Metro that is up with a dead backend still fails sign-in. Confirm the proposal or owner row from a second read (`bunx convex` data, or the Profile tab after a successful save) before calling a mutation proven.

## Evidence

Each run directory contains:

- `state.env` — tmux session name, port, repo root
- `launch.txt`, `launch.log`, `metro-status.txt`
- `doctor.txt`, `surface.txt`
- `drive-<feature>.txt`
- `cleanup.txt` after teardown
- screenshots and ARIA or accessibility dumps when a surface was actually driven

A proof shows the user action and the resulting state. A Metro status page is launch evidence. It is not proof that sign-in, the profile, the sheet, or the map worked. Do not treat a dry bundle request as a driven feature.

## Cleanup

```bash
verify-doggy-path cleanup
```

Cleanup kills the tmux session named in that run's `state.env` and writes `cleanup.txt`. It does not kill other Metro processes, and it does not remove the evidence directory. After cleanup, `doctor.txt` and `drive-<feature>.txt` must still be on disk.

## Helpers

`verify-doggy-path` is the only helper. It is executable. Subcommands are `launch`, `doctor`, `drive`, and `cleanup`, as shown above.

## Maintenance

When the screens change, run `/maintain-verification-skill` so the feature map stays aligned with the app. Suggest a cadence only if someone asks.
