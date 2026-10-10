# doggy-path verification map

This directory is the maintained source for verifying the Owner-facing behavior of doggy-path. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch Metro with `verify-doggy-path launch` from the repo root. The ready line is `packager-status:running` on `http://localhost:8081/status`. That host is the IPv6 loopback. `127.0.0.1` is the wrong address.
- `.env.local` has `EXPO_PUBLIC_CONVEX_URL` pointing at a development Convex deployment. Do not print or commit that URL.
- Run `verify-doggy-path doctor`. Continue a UI drive only when `surface.txt` says `worth-driving: yes`.
- Never drive a Metro this run did not start. `launch` refuses when port 8081 is already taken.
- One Metro instance per machine. Two runs would share the port and the Convex deployment.

## Driving conventions

- Start every recipe from a signed-out or signed-in state the recipe names.
- Prefer the quoted Japanese button labels and section titles. `@expo/ui` buttons expose those strings as their labels.
- Mood chips use `accessibilityRole="radio"`. Breed rows and course number buttons use `accessibilityRole="button"`.
- The helper `verify-doggy-path drive <feature>` only decides whether a native surface is attached. Taps happen on that surface, following the feature file.
- Treat every command as literal.

## Proof and skip reporting

- Capture the user action and the resulting screen, plus a second view of saved account or proposal state.
- UI proof includes a screenshot with the doggy-path UI and the label that changed.
- Record the feature id and the entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- A blocked drive (`result: blocked` in `drive-<feature>.txt`) is not a verified feature.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-doggy-path` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Sign in](./sign-in.md) covers creating an account, signing in, validation, and the gate into onboarding or Home.
- [Dog profile](./dog-profile.md) covers first-time onboarding and later edits on the Profile tab.
- [Course conditions](./course-conditions.md) covers the sheet opened from Home, including an empty request and a revision.
- [Course display](./course-display.md) covers Home while a proposal is working, waiting for confirmation, ready, or failed.
