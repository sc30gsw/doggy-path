# doggy-path feature map

The maintained source for verifying what the Owner sees. Read this index, then the feature file. Each charter line is `slug|target|agent|charter` for the bug-bash fan-out in topic `bug-bash`.

| Feature | Route | Test file | Status |
| --- | --- | --- | --- |
| [Sign in](./sign-in.md) | `/sign-in` | `tests/sign-in.e2e.ts` (validation), `tests/smoke.e2e.ts` (landmark) | tested, not yet run |
| [Dog profile](./dog-profile.md) | `/onboarding`, `/(tabs)/(profile)/profile` | none | untested |
| [Course conditions](./course-conditions.md) | `/conditions` (form sheet over Home) | none | untested |
| [Course display](./course-display.md) | `/(tabs)/(home)` | none | untested |

"tested, not yet run" means the test exists and its locators were taken from the source, not checked with `locate`. Run it once on a Mac and change the status to `tested`.

## Screen structure

- The root stack picks the screen from the session: signed out shows `sign-in`, signed in without a dog profile shows `onboarding`, signed in with one shows the tabs. There is no back navigation between them.
- Sign-in, onboarding, Home and Profile each have a native header: `doggy-path`, `プロフィール登録`, `ホーム`, `プロフィール`.
- Forms are native grouped lists (`@expo/ui` `FieldGroup`). Section titles sit above each group, errors and confirmations in the footer under a group, and the primary action alone in the last group.
- Home and Profile sit under a floating native tab bar labeled `ホーム` and `プロフィール`. Scroll a form to bring its last group above the tab bar.
- The conditions screen is a form sheet over Home with a grabber, at a 92 percent detent.

## Proof and skip reporting

- Capture the user action and the resulting screen, plus a second read of saved account or proposal state.
- Name every artifact with the feature id and the entry point used.
- Report an unreachable path with the command tried and the unmet precondition. A run that never reached the simulator is not a verified feature, and a skipped entry point is not verified through a different one.
