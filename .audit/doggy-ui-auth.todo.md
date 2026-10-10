# Bug fix: post-sign-up app unusable, broken layout, Convex Auth errors

Exit predicate: on the iPhone 17 dev build, sign-in, onboarding, Profile, Home and the conditions sheet render without edge-glued or blank rows; the Owner flows complete; no RN view sits directly in a Host tree and Expo Go launches without the SwiftUIVirtualViewObjC abort; tsc, oxlint and oxfmt pass with no unexpected Metro ERROR; the verify skill exists in .cursor and .claude and was run end to end.

- [x] 1. Reproduce it yourself on the matching surface via the driver skill. Reproduced: breed row blank and untappable, onboarding blocked; Expo Go abort with SwiftUIVirtualViewObjC; layout glued to edges.
- [x] 2. Binary-search the cause. Refuted: Expo Go native mismatch (dev build also blank), re-render cursor reset (ref experiment still reversed), defaultValue reset (ref-captured in source). Confirmed: RN views inside Host (RNHostView wrap made the button appear); kana IME + HID typing reverses text (English keyboard and real kana taps are correct).
- [x] 3. Plan the fix. skip architect: the @expo/ui Host contract dictates the shape; layout choices are local to each screen. Implemented in the lead because every iteration needed the shared simulator.
- [x] 4. Verify on the same surface. Dev build: onboarding save, Home ready, course switch, profile edit persisted after relaunch, saved footer, sign-out. Expo Go: onboarding, conditions with map, confirm, revise prefill, working, ready all-unsuitable. display-failed not reachable (routing always succeeded).
- [x] 5. Stage the commits. skip failing-test-first: no test harness in the repo and the defect is native layout.
- [ ] 6. Run Opening a PR. Pending the Owner's go-ahead (outward-facing).

## Task-specific
- [x] Convex Auth error: InvalidAccountId from an unknown email on ログイン, the expected rejection path.
- [x] Layouts per screen fixed.
- [x] verify skill updated (.cursor) and mirrored (.claude/skills/verify), proven end to end.
- [ ] Owner: restore bun.lock and delete eslint.config.js left by `expo lint` (agent commands were denied).
