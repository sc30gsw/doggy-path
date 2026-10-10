# doggy-path MVP blueprint: a proposal is a persisted state machine

This is the agreed shape for Features 0–4. It was chosen with pstack's `architect` + `arena`: ten runners designed it independently, one judge scored them, and the strongest one (candidate 2) became the base. Ideas from the others were then grafted in (see [Synthesis decision](#synthesis-decision)).

The type and signature sketch sits next to this file under `sketch/`, at the repo paths where each file belongs (`sketch/convex/...` → `convex/...`, `sketch/src/...` → `src/...`). Bodies throw `not implemented`, and the tricky logic is written as `// TODO` pseudocode. A feature's implementer copies that feature's files into place (see [Feature-to-files](#feature-to-files)), then fills in the bodies. The sketch is excluded from tsc, oxlint, oxfmt, fallow and React Doctor, but it was type-checked at its real paths before being committed (see [Typecheck](#typecheck)).

## Problem

We need one shape for the MVP: accounts and the Dog Profile, Course Conditions, a proposal pipeline that calls three external services (Jev, OpenRouteService, Overpass), and a map that shows the result. Three things make the shape non-obvious.

1. **The proposal pauses for the Owner.** A Condition Check warning must offer 「このまま作る」 without redoing finished work. A routing failure must offer a retry. Both mean the pipeline needs a place to resume from, and that place must survive the app being backgrounded.
2. **The rules are split across two runtimes.** Only the app knows the current location. Only the server knows the previous Start Point and holds the API keys. Mood, Breed and the limits are needed by the form, by the Convex validators and by the Jev prompts.
3. **The external contracts are unknown or meant to be swapped.** Jev's wire format is unknown (no SDK, no docs access when this was written). ORS must stay behind one module (ADR 0004).

Constraints honoured:

- ADR 0001: Jev ranks candidates and never builds them.
- ADR 0002: Convex `v` validators are the source of truth. Valibot is used only for forms and external responses.
- ADR 0003: email and password through Convex Auth.
- ADR 0004: ORS stays inside one module.
- AGENTS.md: routes live in `src/app/`. `tsconfig` maps `@/convex/*` to `convex/*`, so the app imports shared code from `convex/domain/`.

## Usage (caller's view)

The app sees **six Convex functions and three hooks**.

```tsx
// Session gate: src/features/account/root-stack.tsx
const session = useSession(); // loading | signedOut | needsProfile | { kind: 'ready', owner }
<Stack.Protected guard={session.kind === 'needsProfile'}><Stack.Screen name="onboarding" /></Stack.Protected>

// Onboarding and the Profile tab: one form, one upsert
const parsed = parseDogProfileDraft(draft); // FormResult<Owner, keyof DogProfileDraft>
if (parsed.ok) await useMutation(api.owners.save)({ owner: parsed.value });

// Course Conditions sheet: 「この条件で提案」, then close; Home follows the new proposal by itself
await useRequestProposal()(parsed.value); // adds the device location only when Start Point is empty
router.back();

// Home: the Owner's current proposal, live. Actions exist only in the phases where they are valid.
const screen = useProposal();
switch (screen.phase) {
  case 'working':           return <WorkingView step={screen.step} />;
  case 'needsConfirmation': return <NeedsConfirmationView onProceed={screen.proceed} onRevise={...} />;
  case 'ready':             return <ReadyView shown={screen.shown} startPoint={screen.startPoint} />;
  case 'failed':            return <FailedView reason={screen.reason} onRetry={screen.retry} />;
}
```

On the server, one internal action calls the two deep modules (`convex/proposalRuns.ts`, real wiring):

```ts
const assessment = await judgeConditions({ dog, conditions, now });             // never throws; falls back
const built = await buildCourseCandidates({ start, targetLengthM: targetLengthM(a.length, a.pace) });
const scoring = await judgeCourseFits({ dog, conditions, assessment, courses: built.courses, now });
await report({ type: 'built', scoring });                                         // → proposals.record (fenced)
```

## Shape

### Data first

- **`owners`** holds one row per Owner: `{ userId, ownerName, dog: DogProfile }`. The Dog Profile is embedded, so "exactly one dog per Owner" holds by structure, and "onboarded" means "the row exists" (no flag). The Owner's name belongs to the Owner, not to the Dog Profile (GLOSSARY), and it is never sent to Jev. Age is never stored: `ageInMonths(birthMonth, now)`.
- **`ProposalState`** (`convex/domain/proposal.ts`) is a discriminated union stored in `proposals.state`. Its phases are `checking`, `awaitingConfirmation`, `building`, `ready`, `failed(checking)` and `failed(building)`.
  - Each phase carries exactly what the next step needs. `building` and `failed(building)` carry the `Assessment`, so 「このまま作る」 and retry never ask Jev again. Only `failed(checking)` re-runs the Condition Check.
  - The phase is also the job description. One internal action, `proposalRuns.run`, looks at the phase it loads and either assesses or builds.
  - Illegal combinations cannot be stored, such as "ready without courses" or "building without an assessment".
- **`proposals`** also stores `conditions` (as entered), the resolved `startPoint` (with its `source`), and `dog`: a snapshot of the Dog Profile taken at request time. Runs, confirm and retry all judge that snapshot, so an edit mid-build cannot mix two dogs into one result.
- **`advance(state, event) → Transition | null`** is the whole lifecycle as one pure, total reducer. A `null` result is an idempotent no-op, which absorbs double taps, late runs and watchdogs. A transition with `startRun: true` makes `commit` bump `attempt` and schedule two things: the run, and a watchdog. The watchdog is the same `record` mutation with `{ failed: timedOut }`, scheduled `RUN_TIMEOUT_MS` (3 min) later.
- **Fencing.** Runs report through `proposals.record({ proposalId, attempt, event })`, and events with a stale attempt are dropped. Runs never write the database. `convex/proposals.ts` is the only writer of the table, and `commit` is its only patch.
- **`Assessment`** is `{ pace, length: LengthDecision, warnings, judgedBy }`: everything the first Jev request decides. That request asks these questions together, and Jev answers them in parallel:
  - targets-consistent (Noul), only when both targets are given
  - too-much-load (Noul), only when at least one target is given
  - Walking Pace (Choice), always, because it also drives every time estimate
  - length class (Choice), only when no target was given

  `targetLengthM(length, pace)` is derived and never stored.
- **`CourseScoring`** is `{ kind: 'byFit', scored: { course, fit }[] } | { kind: 'byLength', courses }`. Either every course has a Fit or none does. One Jev request scores all five courses, so this holds by construction.
- **Ranking happens at read time.** `proposals.current` calls `toProposalView`, which calls `rankCourses(scoring, targetLengthM)`. `FIT_WEIGHTS` and `SHOWN_COURSE_COUNT` live in `convex/domain/tuning.ts`. A weight change takes effect on the next deploy for every stored proposal, with no Jev call and no migration. The reason label (the higher of Body Fit and Mood Fit) is derived in the same place.
- **`ProposalView`** is the only proposal shape the app sees: `{ id, conditions, startPoint, status }`, where `status` is `working | needsConfirmation | ready | failed`. It hides Fit numbers, weights, attempts, the snapshot, and how many candidates were built.
- **`Course`** is provider-neutral: key, path (at most 300 points), distance, ascent, unpaved share, and `surroundings` (`{ greenShare, mainRoadShare }`, or `null` if Overpass failed). The time estimate is not stored; it is derived from the distance and `assessment.pace`.

### Where each rule lives (single source of truth)

| Rule / list | Owner | Derived readers |
|---|---|---|
| Every tunable number | `convex/domain/tuning.ts` | Condition Check threshold, Fit weights, candidate/shown counts, pace km/h, length classes, run timeout |
| JKC breeds | `JKC_BREEDS` in `convex/domain/breeds.ts` | `BreedId`, `isJkcBreedId` (the boundary check), `searchBreeds`, `breedLabel` (UI and Jev) |
| Moods | `MOODS` in `convex/domain/courseConditions.ts` | `Mood`, `moodValidator`, chip order and labels, Jev state. Icons are a `Record<Mood, SymbolViewProps['name']>` in `mood-chips.tsx`, so a new Mood without an icon fails the build. |
| UI copy for codes (reason, warning, failure, working step, start-point note) | `src/features/course-display/labels.ts` | Each table is a `Record` over the domain union, so a new variant fails the build. |
| "Plainly invalid" limits | `CONDITION_LIMITS`, `DOG_PROFILE_LIMITS` | Valibot draft schemas (app) and `findConditionProblems` / `findOwnerProblems` (server). Two readers, one table. |
| Form output shape | Convex `Infer<>` types | `parseConditionsDraft` / `parseDogProfileDraft` declare `FormResult<CourseConditions / Owner>`, so a Valibot schema that drifts from the validator stops compiling. |
| Start Point fallback chain | `resolveStartPoint` (pure) | The app adds `deviceLocation` only when the field is empty. The server adds `previous`: the latest proposal whose Start Point was not the Default Point. It is never stored separately. |
| Pace → km/h, length class → metres | `convex/domain/walk.ts` (values in `tuning.ts`) | judge, run, view |
| Jev wire format and key | `convex/judge/internal/jev.ts` | Nobody else |
| ORS shapes, key and length factor | `convex/courseBuilder/internal/ors.ts` | Only `courseBuilder/index.ts` |

### Deep modules and boundaries

- **`judge/`** exposes two total functions, `judgeConditions → Assessment` and `judgeCourseFits → CourseScoring`, each with its spec fallback built in. Each is exactly one Jev request.
  - `internal/questions.ts` builds the prompts and interprets the answers. It is pure: state in, questions out, answers in, domain value out.
  - `internal/jev.ts` is a generic typed client. `choice('…', [{ id: 'slow', … }])` yields answers keyed by exactly those ids (`JevAnswers<Qs>`). It returns `JevResult` instead of throwing, so a missing fallback is a type error. It validates the guessed wire format with Valibot and is the only place that format lives.
  - `ask: AskJev` is an injectable default parameter, so tests pass a fake.
- **`courseBuilder/`** has one public function: `buildCourseCandidates({ start, targetLengthM }) → { ok, courses: NonEmpty<Course> } | { ok: false, reason }`. Behind it:
  - fixed seeds 1..5, so a retry is repeatable
  - the 0.85 "ask shorter" factor
  - partial-failure tolerance and de-duplication
  - the single Overpass query (a failure degrades to `surroundings: null`)
  - geometry shares and path simplification

  Swapping ORS for GraphHopper touches only `internal/ors.ts` (ADR 0004).
- **`internal/` is unimportable from outside its module.** Feature 0 adds an oxlint `no-restricted-imports` pattern for `**/judge/internal/*` and `**/courseBuilder/internal/*`, with an override that allows them inside their own directory. `src/**` may import only `@/convex/_generated/*` and `@/convex/domain/*`.
- **`convex/domain/`** is pure and depends only on `convex/values` (plus types from `_generated`). It is the one directory the app may import besides `_generated`.
- **Validation lives only at the boundaries:**
  - Valibot: the form drafts (`src/lib/parse-form.ts` is the one helper), and the Jev, ORS and Overpass responses.
  - Convex `v`: function arguments and storage.
  - The shared limits: range and catalog checks inside public mutations.

### Interface depth

The app sees six functions:

- `owners.mine` and `owners.save`
- `proposals.current`, `proposals.request`, `proposals.proceed` and `proposals.retry`

It also sees three hooks: `useSession`, `useRequestProposal` and `useProposal`. Behind them sit the Jev, ORS and Overpass calls, the Condition Check thresholds, the length policy, ranking and weights, the fallbacks, fencing, the watchdog, and the server half of the Start Point chain. The app never coordinates two calls to finish one operation, and it holds no proposal id: an app restart loses nothing.

### What it deliberately does not do

- No proposal history UI. Home shows only the latest proposal.
- No streaming of partial candidates.
- No client-side ranking.
- No separate "last Start Point" field or settings table.
- No email verification or password reset.
- No dependence on the beta `defineApp({ env })` API.

## Module map

```
convex/
  schema.ts                  authTables + owners(by_user) + proposals(by_owner); fields come from domain/
  auth.ts                    convexAuth({ providers: [Password] }) exports; requireOwnerId(ctx)
  auth.config.ts             Convex Auth JWT issuer config
  http.ts                    auth.addHttpRoutes
  owners.ts                  public: mine (query), save (upsert mutation); only writer of owners
  proposals.ts               public: current, request, proceed, retry; internal: loadRun, record; only writer of proposals
  proposalRuns.ts            internal action run: phase → judge | courseBuilder + judge → record (thin, real wiring)
  domain/                    PURE, shared with the app (imports only convex/values + _generated types)
    tuning.ts                every tunable number (placeholders until measured)
    breeds.ts                JKC_BREEDS catalog → BreedId, isJkcBreedId, breedValidator
    dogProfile.ts            dogProfileFields, ownerFields/Owner, DOG_PROFILE_LIMITS, breedLabel, ageInMonths, findOwnerProblems
    courseConditions.ts      MOODS, LatLng, DEFAULT_POINT, courseConditionsValidator, CONDITION_LIMITS, resolveStartPoint
    walk.ts                  WalkingPace, LengthClass, LengthDecision, lengthBasisOf, targetLengthM, estimateMinutes
    proposal.ts              Assessment, Course, Fit, CourseScoring, ProposalState, events, advance (the state machine)
    ranking.ts               rankCourses, weightedScore, FitKind
    proposalView.ts          ProposalView / ProposalStatus / ShownCourses, toProposalView (read-time projection)
  judge/                     SERVER-ONLY: everything asked of Jev
    index.ts                 judgeConditions, judgeCourseFits (one request each, fallbacks built in)
    internal/questions.ts    pure prompt/state builders + answer interpretation
    internal/jev.ts          typed Choice/Noul/Score client, askJev, private Valibot wire schema
  courseBuilder/             SERVER-ONLY (ADR 0004)
    index.ts                 buildCourseCandidates
    internal/ors.ts          round-trip request, ORS Valibot schema, REQUESTED_LENGTH_FACTOR
    internal/overpass.ts     one bbox query → green areas + main roads (null on failure)
    internal/metrics.ts      pure: shares, bounding box, path simplification → Course
  _generated/                codegen (api.d.ts / dataModel.d.ts hand-matched in the sketch; see Typecheck)
src/
  app/
    _layout.tsx              [Feature 1 edit] <AppProviders><AnimatedSplashOverlay/><RootStack/></AppProviders>
    sign-in.tsx              signed-out screen
    onboarding.tsx           Owner's name + Dog Profile, required before the app is usable
    (tabs)/_layout.tsx       NativeTabs: ホーム / プロフィール (SF Symbol + Material icons)
    (tabs)/index.tsx         Home: current proposal (useProposal) + 「コースを提案してもらう」 → /conditions
    (tabs)/profile.tsx       edit Owner + Dog Profile, sign out
    conditions.tsx           form sheet; ?revise=1 prefills from the current proposal for 「条件を直す」
  features/
    account/                 app-providers.tsx (ConvexAuthProvider + token storage), token-storage.ts (SecureStore),
                             use-session.ts, root-stack.tsx (Stack.Protected guards), sign-in-form.tsx
    dog-profile/             dog-profile-draft.ts (Valibot → Owner), dog-profile-form.tsx
                             (+ BreedField, BirthMonthField), breed-search.ts (pure kana search)
    course-conditions/       conditions-draft.ts (Valibot → CourseConditions), course-conditions-form.tsx,
                             mood-chips.tsx (MOOD_SYMBOLS), start-point-field.tsx, device-location.ts,
                             use-request-proposal.ts
    course-display/          use-proposal.ts (phase-scoped actions), proposal-views.tsx (one view per phase),
                             course-map.tsx (Apple/Google provider), labels.ts (Record-keyed copy)
  lib/parse-form.ts          the one Valibot draft → FormResult helper
```

## Feature-to-files

Copy a feature's files from `docs/blueprint/sketch/` to the same paths, then fill in the bodies.

| Feature | Creates / fills | Edits existing | Removes |
|---|---|---|---|
| **0 Starter cleanup** | `src/app/(tabs)/_layout.tsx`, placeholder `(tabs)/index.tsx` and `(tabs)/profile.tsx` | `app.json` (drop `web`), `package.json` (drop the `web` and `reset-project` scripts; drop `react-native-web` / `react-dom` if `expo-doctor` agrees), `src/constants/theme.ts` (drop the `@/global.css` import and the web font branch), `.oxlintrc.json` (the `internal/` and `src → convex` import rules above) | `src/app/index.tsx`, `src/app/explore.tsx`, `src/components/{app-tabs,app-tabs.web,web-badge,external-link,hint-row,animated-icon.web}.tsx`, `animated-icon.module.css`, `ui/collapsible.tsx`, `src/hooks/use-color-scheme.web.ts`, `src/global.css`, `scripts/reset-project.js`, `assets/images/tabIcons/*`, `assets/images/{expo-badge*,expo-logo,react-logo*,logo-glow,tutorial-web,favicon}.png` |
| **1 Account + Dog Profile** | `convex/{schema,auth,auth.config,http,owners}.ts` (schema: `owners` table), `convex/domain/{tuning,breeds,dogProfile}.ts`, `src/features/account/*`, `src/features/dog-profile/*`, `src/lib/parse-form.ts`, `src/app/{sign-in,onboarding}.tsx`, the body of `(tabs)/profile.tsx` | `src/app/_layout.tsx` (AppProviders + RootStack), `package.json` (dependencies below) | — |
| **2 Course Conditions** | `convex/domain/courseConditions.ts`, `src/features/course-conditions/*` (`use-request-proposal.ts` is wired in Feature 3), `src/app/conditions.tsx`, the Home button in `(tabs)/index.tsx` | `root-stack.tsx`: one `Stack.Screen name="conditions"` line (formSheet) | — |
| **3 Course proposal** | `convex/domain/{walk,proposal,ranking,proposalView}.ts`, `convex/proposals.ts`, `convex/proposalRuns.ts`, `convex/judge/**`, `convex/courseBuilder/**`, `use-request-proposal.ts` | `schema.ts` (add the `proposals` table) | — |
| **4 Course display** | `src/features/course-display/*`, the proposal part of `(tabs)/index.tsx` | `app.json` (`["react-native-maps", { "androidGoogleMapsApiKey": … }]`) | — |

Features 0, 1 and 2 touch disjoint files and can run in parallel. Feature 2 can merge before Feature 3 by stubbing the submit. Feature 4 needs `ProposalView` from Feature 3.

Feature 1 must also replace the 10 sample breeds in `JKC_BREEDS` with the full JKC list (about 200), keeping ids stable. Until that is done, the breed picker only shows the samples.

### Dependencies, configuration and env

- **Add with `bunx expo install`:** `@convex-dev/auth` (0.0.96), `@auth/core` (its peer, ^0.41.1), `valibot` (1.5.0) and `expo-secure-store`. The secure store is required: `ConvexAuthProvider` on React Native needs a `storage`.
- **Convex env:** `JEV_API_URL`, `JEV_API_KEY` and `ORS_API_KEY`, plus Convex Auth's `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` (from `npx @convex-dev/auth`).
- **App env:** `EXPO_PUBLIC_CONVEX_URL` (already exists). The Google Maps Android key goes in the `react-native-maps` plugin config in `app.json`.
- **First step of Feature 1:** run `bunx convex dev` to regenerate `convex/_generated/`. The sketch's `api.d.ts` and `dataModel.d.ts` are hand-written to codegen's shape.

## Synthesis decision

The arena ran ten runners: Opus 1–3, Sonnet 4–6 and Haiku 7–10. One Opus cross-judge scored them against a six-criterion rubric, and the parent read every candidate end to end and scored them independently.

**Convergence.** All ten converged on the same core:

- a persisted proposal with a status union
- one pure transition function, with stale writes fenced by a run token
- the Condition Check as a phase inside the proposal, not a separate round trip
- raw Jev scores stored, and ranking derived at read time
- the previous Start Point derived from the latest proposal
- one catalog per closed list
- Jev and ORS each behind one module

That agreement is strong evidence for the shape. The arena therefore picked a base and grafted details; nothing was averaged.

**Base: candidate 2 (Opus).** The cross-judge scored it 30/30 and the parent's own scoring agreed. Candidate 1 was close at 29. Candidate 2 won because:

- **Its invariants are code, not prose.** `advance` → `commit` (the only patch) → `record` (fenced) → `startRun` (run plus watchdog) are written out.
- **It has the most precise failure type.** `failed(checking)` and `failed(building)` are separate variants.
- **Its failures are values.** `JevResult` cannot be ignored.
- **It leaves no starter file edited**, and its feature folders keep Features 0–2 disjoint.

**Grafts**, folded in by hand:

| From | Graft | Why |
|---|---|---|
| C4, C10 | `owners` table with the Dog Profile embedded; the Owner's name on the Owner, not the Dog Profile | One dog per Owner and "onboarded" become structural. It also matches GLOSSARY and settles the base's own open question. |
| C1, C3 | Breed id stored as `v.string()`, checked by `isJkcBreedId` at `owners.save` | It avoids a 200-literal schema union, and adding breeds needs no schema push. |
| C1, C3, C10 | `proposals.current` (the latest proposal) instead of `get(id)` plus a `/proposal/[id]` route; Home renders it | No proposal id in app state, so a restart or tab switch loses nothing. One fewer route and one fewer untrusted parameter. |
| C1 | `request` returns the in-flight proposal's id while one is working | A double tap cannot spend ORS quota twice. |
| C3 | `useProposal` returns a phase union whose `proceed` / `retry` exist only where valid | Calling them in the wrong phase is a compile error. |
| C3, C10 | Dog Profile snapshot on each proposal | Retry and confirm judge the same dog the Owner asked about. |
| C4 | `convex/domain/tuning.ts` holding every tunable number | Every placeholder is in one place for the product owner. Provider-specific numbers stay in `internal/`. |
| C5 | The previous Start Point skips proposals that used the Default Point | "Previous" means a place the Owner was. |
| C7 | One Jev request scoring all five courses (Body and Mood Fit per course) instead of five requests | One HTTP call instead of five, and all-or-nothing scoring by construction. |
| C10 | Fixed ORS seeds | Retries are repeatable. |
| C1 | The `internal/` folder convention, plus an oxlint rule | Internals become unimportable from outside their module (red flag: importable internals). |
| Judge | `RUN_TIMEOUT_MS` raised from 90 s to 3 min | Five ORS calls, Overpass and two Jev requests can exceed 90 s. |

**Rejected:**

| From | Rejected | Why |
|---|---|---|
| C3 | `defineApp({ env })` | It exists in convex 1.46 but is marked beta and unstable. |
| C3, C10 | Fail the proposal when Overpass fails | The spec makes only routing fatal, so Overpass degrades to `surroundings: null`. |
| C5 | Mark the result "unjudged" on an Overpass failure | It would show 「おすすめ順ではありません」 while Jev is up. |
| C7, C9 | A separate `courseCandidates` table | Candidates are written once and read as a set, so the extra table adds a join and partial-write states. |
| C7 | Stage-per-recorder mutations | Split ownership of one row. |
| C7 | Platform-split Birth Month picker | It rests on a false claim: the universal `@expo/ui` `Picker` has an Android implementation. |
| C6 | `discard` deletes the proposal on 「条件を直す」 | It would erase the previous Start Point. |
| C10 | `lastStartPoint` stored on the owner | A second copy of what proposals already hold. |
| C9 | A `dismissed` phase | 「条件を直す」 needs no server call. |
| C8 | Edge-table lifecycle without an attempt token | Concurrent runs are possible. |
| C4, C7, C8, C9 | No watchdog | A crashed action would leave a proposal stuck. |
| C1 | `expo-symbols` types imported into shared server code | Icons stay in the app. |
| C4, C8, C10 | `requestId` / `clientKey` idempotency | The in-flight check covers double taps without `expo-crypto`. |

**Dropouts:** none. All ten candidates produced a type-checking blueprint.

## Tradeoffs accepted

- **A persisted proposal, a scheduler and a watchdog**, which add more moving parts than an action that returns its result. In exchange, confirm and retry resume without redoing work, progress is reactive, and a proposal survives the app being backgrounded.
- **All 5 courses' paths are stored**, capped at 300 points each (roughly 60 KB per document). In exchange, ranking stays a read-time derivation, and weights are tunable without Jev.
- **One Jev request for all five courses' Fit** (10 Score questions). In exchange, there is one HTTP call and all-or-nothing scoring by construction. If Jev's quality degrades with five courses in one state, only `judgeCourseFits` and `fitQuestions` change.
- **Walking Pace is always asked in the Condition Check request**, even when Target Distance is given. In exchange, every time estimate uses the dog's own pace, and a resume never needs a second Jev round.
- **Japanese labels for Mood and Breed live in `convex/domain/`**, because Jev needs them as much as the UI does. UI-only copy stays in the app, in `Record` tables.
- **An Overpass failure degrades** (`surroundings: null`) instead of failing the proposal. Overpass is enrichment; the spec's "error + retry" applies to routing.
- **Home shows only the latest proposal.** Older ones stay in the table, unseen. They are needed to derive the previous Start Point, and there is no retention rule yet.
- **A few bodies are real code, not stubs:** `proposalRuns.run`, `commit`, `startRun`, `record`, `applyOwnerEvent`, `useSession`, `useRequestProposal`, `useProposal`, `RootStack` and the Home switch. They are the type-checked call sites that prove the stubs compose. All the domain logic they call still throws `not implemented`.
- **The sketch lives in `docs/blueprint/sketch/`, not at its real paths.** In exchange, the repo builds and lints cleanly until each feature copies its files in. This also keeps the hand-written `_generated` files and the colliding `/` routes out of the app.

## Alternatives considered

- **The action returns directly, and the app orchestrates:** `checkConditions()` returns an assessment, then `propose(conditions, assessment)` returns the courses. This exposes the pipeline's stages to the caller, makes the app hold in-progress state across backgrounding, and forces the server either to trust a client-supplied Assessment or to re-ask Jev.
- **One `propose({ acceptWarnings })` action, called twice.** Either the Condition Check runs again (redone work, and possibly a different answer), or a cache is needed, which is the persisted document by another name.
- **A persisted pipeline with one scheduled action per stage plus a `courseCandidates` table.** This is temporal decomposition: four fencing points, partial-candidate rows and cross-table invariants, all for progress granularity nobody asked for.
- **Ranking stored at write time.** Changing the weights would mean re-running Jev or migrating data, and the spec forbids the first.

## Open questions and risks

- **ORS quota.** 2,000 requests a day and 40 a minute, at 5 calls per proposal, is about 8 proposals a minute app-wide. Is the in-flight dedupe enough at launch, or do we need a per-Owner cooldown or a global counter?
- **Jev's wire shape for Choice and Score.** It is unknown. `internal/jev.ts` assumes a per-key distribution or probability, and computes a Score position from a level distribution if one is given.
- **One Fit request for five courses.** Does it stay accurate and within Jev's limits? The fallback is five per-course requests, and only `judgeCourseFits` would change.
- **No Mood.** When the Owner gives no Mood, we skip Mood Fit and rank by Body Fit alone. Should Today's Memo still drive a Mood Fit in that case?
- **Retention.** Proposal documents accumulate, and they store device locations. Do we need a retention rule (for example a daily cron that keeps only each Owner's latest few) and a privacy note?
- **Tuning.** `CONDITION_CHECK_THRESHOLD`, `FIT_WEIGHTS`, `WALKING_PACE_KMH`, `LENGTH_CLASS_M` and `RUN_TIMEOUT_MS` are placeholders. Who tunes them, and against what examples?
- **Dog Memo privacy.** The Dog Memo, which can hold health facts, is sent to Jev. Does the Owner need to be told?

## Next implementation step

Implement and unit-test `advance` in `convex/domain/proposal.ts`, together with `rankCourses` and `toProposalView`. They are pure, every other Feature 3 and 4 file depends on them, and the real wiring in `proposals.ts` and `proposalRuns.ts` already calls them. Features 0–2 can start in parallel.

## Typecheck

Before being moved to `docs/blueprint/sketch/`, the sketch was type-checked at its real paths in a clean worktree of this branch, with `@convex-dev/auth` 0.0.96, `@auth/core` 0.41 and `valibot` 1.5.0 in `node_modules`. `bunx tsc --noEmit` reported only the two pre-existing starter errors:

```
src/components/animated-icon.web.tsx(5,21): error TS2307: Cannot find module './animated-icon.module.css' …
src/constants/theme.ts(6,8): error TS2882: Cannot find module or type declarations for side-effect import of '@/global.css'.
```

Feature 0 removes both. `bunx oxlint convex src` reported only the starter's existing errors (`themed-view.tsx` unused parameters, and `use-color-scheme.web.ts`).

`convex codegen` needs a deployment, so `sketch/convex/_generated/api.d.ts` and `dataModel.d.ts` are hand-written to codegen's templates for these modules. `bunx convex dev` regenerates them.
