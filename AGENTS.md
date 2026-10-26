This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
bun run lint                # lint (oxlint). Never `expo lint`: it installs ESLint and writes eslint.config.js
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`sc30gsw/doggy-path`, via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Rules and what enforces them

Rules here come from operator corrections. When the operator corrects an agent, fix the mistake and add or update a row. A rule with nothing enforcing it that gets broken again must be fixed at a higher level (architecture, types, lint, test) in the same change. Drop a row once its mistake can no longer happen.

| Rule | Enforced by |
|---|---|
| Write docs, ADRs, the glossary, code comments and PR text in English. Japanese appears only as UI copy (quoted screen labels). | Nothing fails. Every agent-facing file is English, so the nearest example an agent copies is English. |
| Run feature and design work through pstack (`/poteto-mode` Feature playbook: `architect` with `arena`, then `/no-comments`), not straight to code. | The `pstack` plugin, enabled in `.claude/settings.json` as `pstack@cursor-plugins`, with the `cursor-plugins` marketplace (`cursor/plugins`) declared under `extraKnownMarketplaces`, so every session can resolve it. Nothing fails if an agent skips the playbook. |
| Convex code follows the Convex Best Practices: typed `env` from `convex.config.ts`, thin public functions over `convex/model/`, `.withIndex` instead of `.filter`, no unbounded `.collect`, table names on `ctx.db` calls, access control in every public function, only `internal.*` scheduled. | Partly: the blueprint sketch follows them (`docs/blueprint/RATIONALE.md`, "Best practices"). Feature 0 adds oxlint's `@convex-dev/eslint-plugin` rules (via `jsPlugins`) and type-aware `no-floating-promises`. `explicit-table-ids` and `no-collect-in-query` need type information oxlint's JS plugins lack, so review enforces them. |
| Jev prompts (`instructions`, `criteria`) are English; the Owner's text and the UI stay Japanese. Keep arithmetic out of Jev and give it numbers as words. | ADR 0005 and the code in `convex/judge/internal/questions.ts`, the nearest example. Nothing fails. |
| Code carries no narration or pseudocode comments; constraints live in names, types and data. Run `/no-comments` before opening a PR. | Nothing fails. pstack's `/no-comments` (Comment Sicko) is the check. |
| Inside an `@expo/ui` `Host`, every descendant is an `@expo/ui` view. A React Native view inside a Host goes through `RNHostView`, sized by a parent `Column` when it has no intrinsic size. A React Native `Modal` or list renders outside the Host. | Nothing fails at build time. A violation renders as an empty, untappable row in a dev build and aborts Expo Go with `SwiftUIVirtualViewObjC`. The verify-doggy-path skill (`.agents/skills/verify-doggy-path`) drives every screen on the simulator through e2e. |
| Lint with `bun run lint` (oxlint). Never run `expo lint`. | The Commands block above. `expo lint` installs ESLint, rewrites `package.json` and `bun.lock`, and adds `eslint.config.js`, which also stops the react-doctor pre-commit hook from scanning. |

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
