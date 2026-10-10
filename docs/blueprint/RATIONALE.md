# doggy-path MVP blueprint: a proposal is a persisted state machine

This is the agreed shape for Features 0–4. It was chosen with pstack's `architect` + `arena`: ten runners designed it independently, one judge scored them, and the strongest one (candidate 2) became the base. Ideas from the others were then grafted in (see [Synthesis decision](#synthesis-decision)).

After that, the sketch went through pstack's `/no-comments` and was aligned with the Convex, TypeScript and Expo best practices (see [Best practices](#best-practices) and [No-comments pass](#no-comments-pass)).

It was then revised against the live TypeSafe and OpenRouteService docs in a second `/grill-with-docs` session (see [Docs revision](#docs-revision-typesafe-and-openrouteservice)).

The type and signature sketch sits next to this file under `sketch/`, at the repo paths where each file belongs (`sketch/convex/...` → `convex/...`, `sketch/src/...` → `src/...`).

- **What is real code and what is not.** Code is the spec. Pure domain logic, the proposal lifecycle and the thin Convex wrappers are real code. Bodies that call external services or render UI throw `not implemented`. What those bodies must do is written under [Implementation notes](#implementation-notes), not in comments.
- **How to use it.** A feature's implementer copies that feature's files into place (see [Feature-to-files](#feature-to-files)), then fills in the bodies.
- **Tooling.** The sketch is excluded from tsc, oxlint, oxfmt, fallow and React Doctor. It was type-checked and linted at its real paths before being committed (see [Typecheck](#typecheck)).

## Problem

We need one shape for the MVP: accounts and the Dog Profile, Course Conditions, a proposal pipeline that calls three external services (Jev, OpenRouteService, Overpass), and a map that shows the result. Three things make the shape non-obvious.

1. **The proposal pauses for the Owner.** A Condition Check warning must offer 「このまま作る」 without redoing finished work. A routing failure must offer a retry. Both mean the pipeline needs a place to resume from, and that place must survive the app being backgrounded.
2. **The rules are split across two runtimes.** Only the app knows the current location. Only the server knows the previous Start Point and holds the API keys. Mood, Breed and the limits are needed by the form, by the Convex validators and by the Jev prompts.
3. **The external contracts are new or meant to be swapped.** Jev's wire format and ORS's error codes come from their docs and source, not yet from a live response. ORS must stay behind one module (ADR 0004).

Constraints honoured:

- ADR 0001: Jev ranks candidates and never builds them.
- ADR 0002: Convex `v` validators are the source of truth. Valibot is used only for forms and external responses.
- ADR 0003: email and password through Convex Auth.
- ADR 0004: ORS stays inside one module.
- ADR 0005: Jev prompts are in English; the UI stays Japanese.
- ADR 0006: the Dog Memo and Today's Memo are sent to Jev; the Owner's name is not.
- AGENTS.md: routes live in `src/app/`. `tsconfig` maps `@/convex/*` to `convex/*`, so the app imports shared code from `convex/domain/`.

## Usage (caller's view)

The app sees **six Convex functions (plus Convex Auth's `signIn` / `signOut`) and three hooks**.

```tsx
// Session gate: src/features/account/root-stack.tsx
const session = useSession(); // loading | signedOut | needsProfile | { kind: 'ready', owner }
<Stack.Protected guard={session.kind === 'needsProfile'}><Stack.Screen name="onboarding" /></Stack.Protected>

// Onboarding and the Profile tab: one form, one upsert
const save = useMutation(api.owners.save);
const parsed = parseDogProfileDraft(draft); // FormResult<Owner, keyof DogProfileDraft>
if (parsed.ok) await save({ owner: parsed.value });

// Course Conditions sheet: 「この条件で提案」, then close; Home follows the new proposal by itself
const requestProposal = useRequestProposal(); // adds the device location only without a chosenStartPoint
const outcome = await requestProposal(conditions); // { ok: false, refusal: 'dailyLimitReached' } past the cap
if (outcome.ok) router.back();

// Home: the Owner's current proposal, live. Actions exist only in the phases where they are valid.
const screen = useProposal();
switch (screen.phase) {
  case 'working':           return <WorkingView step={screen.step} />;
  case 'needsConfirmation': return <NeedsConfirmationView onProceed={screen.proceed} onRevise={...} />;
  case 'ready':             return <ReadyView dogName={screen.dogName} shown={screen.shown} startPoint={screen.startPoint} />;
  case 'failed':            return <FailedView reason={screen.reason} retryableAt={screen.retryableAt} onRetry={screen.retry} />;
}
```

On the server, one internal action calls the two deep modules (`convex/proposalRuns.ts`):

```ts
const assessment = await judgeConditions({ dog, conditions, now });              // never rejects; falls back
const built = await buildCourseCandidates({ start, targetLengthM: targetLengthM({ length, pace }) });
const scoring = await judgeCourseFits({ dog, conditions, assessment, courses: built.courses, now });
await report({ type: 'built', scoring });                                          // → proposals.record (fenced)
```

## Shape

### Data first

- **`owners`** holds one row per Owner: `{ userId, ownerName, dog: DogProfile }`.
  - The Dog Profile is embedded, so "exactly one dog per Owner" holds by structure, and "onboarded" means "the row exists" (no flag).
  - The Owner's name belongs to the Owner, not to the Dog Profile (GLOSSARY), and it is never sent to Jev.
  - Birth Month is `{ year, month: 1..12 literal, estimated }`, so a 0-based month cannot be stored. Age is never stored: `ageInMonths({ birthMonth, now })`.
- **`ProposalState`** (`convex/domain/proposal.ts`) is a discriminated union stored in `proposals.state`. Its phases are `checking`, `awaitingConfirmation`, `building`, `ready`, `failed(checking)` and `failed(building)`. Both failed phases carry `failedAt`, so `retry` is a no-op until `retryableAt(state)` (`RETRY_COOLDOWN_MS` later).
  - Each phase carries exactly what the next step needs. `building` and `failed(building)` carry the `Assessment`, so 「このまま作る」 and retry never ask Jev again. Only `failed(checking)` re-runs the Condition Check.
  - The phase is also the job description. One internal action, `proposalRuns.run`, looks at the phase it loads and either assesses or builds.
  - Illegal combinations cannot be stored, such as "ready without courses" or "building without an assessment".
- **`proposals`** is keyed by `userId` (the Convex Auth user id, like `owners.userId`). It also stores:
  - `conditions`, as entered. Within them, `chosenStartPoint` is only what the Owner picked.
  - the resolved `startPoint`, with its `source`
  - `dogSnapshot`: the Dog Profile as it was at request time. Runs, confirm and retry all judge this snapshot, so an edit mid-build cannot mix two dogs into one result.
- **`advance({ state, event, now }) → Transition`** is the whole lifecycle: one pure, total reducer, written out as code. `now` comes from the calling mutation, never from a query.
  - `{ kind: 'ignored' }` is an idempotent no-op, which absorbs double taps, late runs, watchdogs and retries inside the cooldown.
  - An `advanced` transition with `startRun: true` makes `commit` bump `attempt` and schedule two things: the run, and a watchdog. The watchdog is the same `record` mutation with `{ failed: timedOut }`, scheduled `RUN_TIMEOUT_MS` later.
- **Fencing.** Runs report through `proposals.record({ proposalId, attempt, event })`, and events with a stale attempt are dropped.
  - Runs never write the database. `convex/model/proposals.ts` is the only writer of the table, and `commit` is its only patch.
  - `proceed` and `retry` act only on the Owner's latest proposal, so a stale screen cannot restart an older one next to a new run.
- **A timed-out run stops spending.** The watchdog cannot cancel a running action, so every external call carries its own timeout from `CALL_TIMEOUT_MS`. `RUN_TIMEOUT_MS` is derived as twice the slowest run (ORS + Overpass + Jev). So by the time the Owner can retry a `timedOut` proposal, the old run has stopped calling ORS.
- **`Assessment`** is `{ pace, length: LengthDecision, warnings, judgedBy }`: everything the Condition Check decides. The first Jev request asks three questions together, and Jev answers them in parallel:
  - too-much-load (Noul), always, because a Today's Memo like 「足を痛めている」 matters even with no targets
  - Walking Pace (Choice), always, because it also drives every time estimate
  - length class (Choice), always, as a speculative question: code uses it only when no target was given

  Whether the two targets agree is arithmetic, so code decides it: `targetsAreConsistent` compares the speed the targets imply with `WALKING_PACE_KMH[pace]`, within `TARGETS_PACE_RATIO_LIMIT`. It runs on the fallback pace too, so `targetsInconsistent` still warns when Jev is down.

  `targetLengthM({ length, pace })` is derived and never stored.
- **`CourseScoring`** is `{ kind: 'byFit', scored: { course, fit }[] } | { kind: 'byLength', courses }`. Either every course has a Fit or none does. One Jev request scores all five courses, and `readAnswers` treats a missing answer as `malformed`, so this holds by construction.
- **`Fit`** is `{ bodyPositionTowardBest, moodPositionTowardBest, unsuitableProbability }`: two Score positions and one Noul probability. Weighted scores trade strengths against weaknesses, so a clear problem (hills for a dog with bad joints) is asked separately as `unsuitable`, and ranking puts unsuitable courses last whatever their weighted score.
- **Ranking happens at read time.** `proposals.current` calls `toProposalView`, which calls `rankCourses({ scoring, targetLengthM })`.
  - `FIT_WEIGHTS` and `SHOWN_COURSE_COUNT` live in `convex/domain/tuning.ts`. A weight change takes effect on the next deploy for every stored proposal, with no Jev call and no migration.
  - The reason label (the stronger of Body Fit and Mood Fit) and the `unsuitable` flag are derived in the same place.
- **`ProposalView`** is the only proposal shape the app sees: `{ id, dogName, conditions, startPoint, status }`, where `status` is `working | needsConfirmation | ready | failed`. A failed status carries `retryableAt` for the countdown, and a recommended result carries `allUnsuitable`. It hides Fit numbers, weights, attempts, the rest of the snapshot, and how many candidates were built.
- **`Course`** is provider-neutral:
  - key and path (at most `MAX_PATH_POINTS`)
  - distance, ascent and unpaved share
  - `surroundings`: `{ kind: 'known', greenShare, mainRoadShare }`, or `{ kind: 'unknown' }` if Overpass failed

  The time estimate is not stored. It is derived from the distance and `assessment.pace`.

### Where each rule lives (single source of truth)

| Rule / list | Owner | Derived readers |
|---|---|---|
| Every product-tuning number | `convex/domain/tuning.ts` | Condition Check and Unsuitable thresholds, the targets pace ratio, Fit weights, candidate and shown counts, pace km/h, length classes (`upToM`, `representativeM`), per-call timeouts and the derived run timeout, retry cooldown, the daily proposal cap and window, and the retained proposal count (derived from the cap). Storage caps stay next to their type (`MAX_PATH_POINTS`). Provider quirks stay in `internal/` (`ROUND_TRIP_OVERSHOOT_COMPENSATION`, `ROUND_TRIP_POINTS`, `NO_ROUTE_ERROR_CODES`, `UNPAVED_SURFACE_IDS`, `MAIN_ROAD_PROXIMITY_M`, `JEV_MODEL`). |
| JKC breeds | `JKC_BREEDS` (`ja`, `kana`, `en`) and `BREED_CHOICE_LABELS` (ミックス / その他) in `convex/domain/breeds.ts` | `BreedId`, `isJkcBreedId` (the boundary check), `searchBreeds`, `breedLabel` (UI), `breedForJev` (English, ADR 0005) |
| Moods | `MOOD_IDS` (chip order) in `convex/domain/courseConditions.ts` | `Mood`, `moodValidator`, the Valibot `picklist`. Japanese labels and icons are one `MOOD_CHIPS: Record<Mood, { label, symbol }>` in `mood-chips.tsx`; Jev's English is `MOOD_FOR_JEV: Record<Mood, string>` in `judge/internal/questions.ts`. A new Mood without a label, an icon or a Jev description fails the build. |
| Months, sexes | `MONTHS`, `SEXES` in `convex/domain/dogProfile.ts` | Convex validators and the Valibot `picklist`s |
| Default Point | `DEFAULT_POINT` and `DEFAULT_POINT_NAME` (東京駅) in `convex/domain/courseConditions.ts` | `resolveStartPoint`, the start-point note, the Start Point field's hint |
| UI copy for codes (reason, warning, failure, working step, start-point note, unsuitable, retry countdown) | `src/features/course-display/labels.ts`; request refusals in `src/features/course-conditions/labels.ts` | Each table is a `Record` over the domain union, so a new variant fails the build. |
| "Plainly invalid" limits | `CONDITION_LIMITS`, `DOG_PROFILE_LIMITS` | Valibot draft schemas (app) and `findConditionProblems` / `findOwnerProblems` (server). Two readers, one table. |
| Form output shape | Convex `Infer<>` types | `parseConditionsDraft` / `parseDogProfileDraft` end in a `vb.transform` that returns `CourseConditions` / `Owner` and declare that type, so a schema that drifts from the validator stops compiling. |
| Start Point fallback chain | `resolveStartPoint` (pure) | The app adds `deviceLocation` only without a `chosenStartPoint`. The server adds `previous`: the latest retained proposal whose Start Point was not the Default Point. It is never stored separately. |
| Environment variables | `convex/convex.config.ts` (`defineApp({ env })`) | Typed `env` from `_generated/server`. No `process.env` in Convex code. |
| Jev wire format | `convex/judge/internal/jev.ts` (`toWireRequest`, `wireResponseSchema`, each question's `read`) | Nobody else |
| ORS shapes and quirks | `convex/courseBuilder/internal/ors.ts` (`roundTripRequestBody`, `roundTripResponseSchema`, `toFailedRoundTrip`) | Only `courseBuilder/index.ts` |

### Deep modules and boundaries

- **`judge/`** exposes two functions that never reject for a Jev problem: `judgeConditions → Assessment` and `judgeCourseFits → CourseScoring`. Each has its spec fallback built in, and each is exactly one Jev request.
  - `internal/questions.ts` builds the prompts and interprets the answers. It is pure: state in, questions out, answers in, domain value out.
  - `internal/jev.ts` is a generic typed client. Each question carries its wire form and a `read` that turns a wire answer into a typed one: `choice({ ask, optionsNeutralFirst })` yields `{ likeliest, confidence }` over exactly those option ids, `noul` yields `{ probability }`, and `score({ ask, levelsWorstToBest })` yields `{ positionTowardBest }` (`score / (levels − 1)`). It returns `JevResult` instead of throwing, so a missing fallback is a type error.
  - `ask` is an injectable property defaulting to `askJev`, so tests pass a fake.
- **`courseBuilder/`** has one public function: `buildCourseCandidates({ start, targetLengthM }) → { ok, courses: NonEmpty<Course> } | { ok: false, reason }`. `requestRoundTrip` returns `loop | noRoute | unavailable` as one union. Swapping ORS for GraphHopper touches only `internal/ors.ts` (ADR 0004). `internal/geo.ts` holds the provider-neutral distance helpers.
- **`convex/model/`** holds the `ctx` helpers (identity, loading, the lifecycle writes). The public functions in `owners.ts` and `proposals.ts` are thin wrappers over it. This follows Convex's "use helper functions to write shared code" practice.
- **`internal/` is unimportable from outside its module.** Feature 0 adds an oxlint `no-restricted-imports` pattern for `**/judge/internal/*` and `**/courseBuilder/internal/*`, with an override that allows them inside their own directory. `src/**` may import only `@/convex/_generated/*` and `@/convex/domain/*`.
- **`convex/domain/`** is pure and depends only on `convex/values` (plus types from `_generated`). It is the one directory the app may import besides `_generated`.
- **Validation lives only at the boundaries:**
  - **Valibot:** the form drafts (`src/lib/parse-form.ts` is the one helper), and the Jev, ORS and Overpass responses.
  - **Convex `v`:** function arguments and storage.
  - **The shared limits:** range and catalog checks inside public mutations.
  - **Inside the boundaries,** types are trusted.

### Interface depth

The app sees six functions:

- `owners.mine` and `owners.save`
- `proposals.current`, `proposals.request`, `proposals.proceed` and `proposals.retry`

It also sees three hooks (`useSession`, `useRequestProposal` and `useProposal`), plus Convex Auth's `useAuthActions` for sign-in and sign-out.

Behind that surface sit:

- the Jev, ORS and Overpass calls
- the Condition Check thresholds and the length policy
- ranking and weights, and the fallbacks
- fencing and the watchdog
- the server half of the Start Point chain

The app never coordinates two calls to finish one operation, and it holds no proposal id: an app restart loses nothing.

### What it deliberately does not do

- No proposal history UI. Home shows only the latest proposal, and only the latest `RETAINED_PROPOSAL_COUNT` are kept.
- No streaming of partial candidates.
- No client-side ranking.
- No separate "last Start Point" field or settings table.
- No email verification or password reset.

## Module map

```
convex/
  convex.config.ts           defineApp({ env }): every Convex env var, typed
  schema.ts                  authTables + owners(by_user) + proposals(by_user); fields come from domain/
  auth.ts                    convexAuth({ providers: [Password] }) exports
  auth.config.ts             Convex Auth JWT issuer (env.CONVEX_SITE_URL)
  http.ts                    auth.addHttpRoutes
  owners.ts                  public: mine (query), save (mutation) — thin
  proposals.ts               public: current, request, proceed, retry; internal: loadRun, record — thin
  proposalRuns.ts            internal action run: phase → judge | courseBuilder + judge → record
  model/                     ctx helpers (server-only)
    owners.ts                findOwnerId, requireOwnerId, loadOwner, saveOwner (only writer of owners)
    proposals.ts             currentView, requestProposal (→ started | alreadyWorking), applyOwnerEventToLatest,
                             recordRunEvent, loadRunInput,
                             commit, startRun (only writer of proposals)
  domain/                    PURE, shared with the app (imports only convex/values + _generated types)
    tuning.ts                every product-tuning number (placeholders until the evals in convex/judge/evals/)
    breeds.ts                JKC_BREEDS, BREED_CHOICE_LABELS, breedValidator, isJkcBreedId
    dogProfile.ts            MONTHS, SEXES, dogProfileFields, ownerFields/Owner, DOG_PROFILE_LIMITS,
                             breedLabel, ageInMonths, findOwnerProblems
    courseConditions.ts      MOOD_IDS, MOOD_LABELS, LatLng, DEFAULT_POINT(_NAME), courseConditionsValidator,
                             CONDITION_LIMITS, findConditionProblems, resolveStartPoint
    walk.ts                  WalkingPace, LengthClass, LengthDecision, lengthBasisOf, targetLengthM,
                             targetsAreConsistent, estimateMinutes
    proposal.ts              Assessment, Course, Fit, CourseScoring, ProposalState, events, isWorking, advance,
                             retryableAt
    ranking.ts               rankCourses, FitKind
    proposalView.ts          ProposalView / ProposalStatus / ShownCourses, toProposalView
  judge/                     SERVER-ONLY: everything asked of Jev
    index.ts                 judgeConditions (+ the code targets check), judgeCourseFits
    internal/questions.ts    pure English prompts, words-not-numbers state, answer interpretation, MOOD_FOR_JEV
    internal/jev.ts          typed Choice/Noul/Score client: toWireRequest, readAnswers, askJev
    evals/                   [Feature 3] representative cases that set the thresholds and weights
  courseBuilder/             SERVER-ONLY (ADR 0004)
    index.ts                 buildCourseCandidates (fixed seeds 1..CANDIDATE_COUNT)
    internal/ors.ts          requestRoundTrip → RoundTripResult, toRoundTripResult, toFailedRoundTrip
    internal/geo.ts          pure: distanceBetweenM, pathLengthM
    internal/overpass.ts     fetchSurroundings (null on failure)
    internal/metrics.ts      pure: boundingBoxOf, toCourse
  _generated/                codegen (api.d.ts / dataModel.d.ts / server.d.ts hand-matched in the sketch)
src/
  app/
    _layout.tsx              [Feature 1 edit] <AppProviders><AnimatedSplashOverlay/><RootStack/></AppProviders>
    sign-in.tsx              signed-out screen
    onboarding.tsx           Owner's name + Dog Profile, required before the app is usable
    (tabs)/_layout.tsx       NativeTabs: ホーム / プロフィール (SF Symbol + Material icons)
    (tabs)/(home)/           _layout.tsx (Stack, title ホーム), index.tsx: Home per proposal phase (useProposal) + 「コースを提案してもらう」 → /conditions
    (tabs)/(profile)/        _layout.tsx (Stack, title プロフィール), profile.tsx: edit Owner + Dog Profile, sign out
    conditions.tsx           form sheet; ?revise=1 prefills from the current proposal for 「条件を直す」
  features/
    account/                 app-providers.tsx (ConvexAuthProvider + token storage), token-storage.ts,
                             use-session.ts, root-stack.tsx (Stack.Protected guards), sign-in-form.tsx
    dog-profile/             dog-profile-draft.ts (Valibot → Owner), dog-profile-form.tsx
                             (+ BreedPicker outside the Host, BirthMonthRows), breed-search.ts
    course-conditions/       conditions-draft.ts (Valibot → CourseConditions), course-conditions-form.tsx,
                             mood-chips.tsx (MOOD_CHIPS), start-point-field.tsx, device-location.ts,
                             use-request-proposal.ts (→ RequestOutcome), labels.ts (refusal copy)
    course-display/          use-proposal.ts (phase-scoped actions), proposal-views.tsx (one view per phase),
                             course-map.tsx (Apple/Google provider), labels.ts (Record-keyed copy)
  lib/parse-form.ts          the one Valibot draft → FormResult helper
```

## Feature-to-files

Copy a feature's files from `docs/blueprint/sketch/` to the same paths, then fill in the bodies.

| Feature | Creates / fills | Edits existing | Removes |
|---|---|---|---|
| **0 Starter cleanup** | `src/app/(tabs)/_layout.tsx`, placeholder `(tabs)/(home)/index.tsx` and `(tabs)/(profile)/profile.tsx` | `src/app/_layout.tsx` (stop importing `AppTabs`; render a plain `Stack` over `(tabs)`), `app.json` (drop `web`), `package.json` (drop the `web` and `reset-project` scripts; drop `react-native-web` / `react-dom` if `expo-doctor` agrees), `src/constants/theme.ts` (drop the `@/global.css` import and the web font branch), lint config (see [Best practices](#best-practices)) | `src/app/index.tsx`, `src/app/explore.tsx`, `src/components/{app-tabs,app-tabs.web,web-badge,external-link,hint-row,animated-icon.web}.tsx`, `animated-icon.module.css`, `ui/collapsible.tsx`, `src/hooks/use-color-scheme.web.ts`, `src/global.css`, `scripts/reset-project.js`, `assets/images/tabIcons/*`, `assets/images/{expo-badge*,expo-logo,react-logo*,logo-glow,tutorial-web,favicon}.png` |
| **1 Account + Dog Profile** | `convex/{schema,auth,auth.config,http,owners}.ts` (schema: `owners` table only), `convex/convex.config.ts` (the Convex Auth vars only), `convex/model/owners.ts`, `convex/domain/{breeds,dogProfile}.ts`, `src/features/account/*`, `src/features/dog-profile/*`, `src/lib/parse-form.ts`, `src/app/{sign-in,onboarding}.tsx`, the body of `(tabs)/(profile)/profile.tsx` | `src/app/_layout.tsx` (AppProviders + RootStack, after Feature 0), `package.json` (dependencies below) | — |
| **2 Course Conditions** | `convex/domain/courseConditions.ts`, `src/features/course-conditions/*` (except `use-request-proposal.ts`), `src/app/conditions.tsx` without the `?revise` prefill | `root-stack.tsx` (one `Stack.Screen name="conditions"` line, after Feature 1), the Home button in `(tabs)/(home)/index.tsx` | — |
| **3 Course proposal** | `convex/domain/{tuning,walk,proposal,ranking,proposalView}.ts`, `convex/model/proposals.ts`, `convex/proposals.ts`, `convex/proposalRuns.ts`, `convex/judge/**`, `convex/courseBuilder/**`, `use-request-proposal.ts` | `schema.ts` (add the `proposals` table), `convex.config.ts` (add `TYPESAFE_API_KEY`, `ORS_API_KEY`, `OVERPASS_API_URL`), `conditions.tsx` (add the `?revise` prefill from `proposals.current`) | — |
| **4 Course display** | `src/features/course-display/*`, the proposal part of `(tabs)/(home)/index.tsx` | `app.json` (`["react-native-maps", { "androidGoogleMapsApiKey": … }]`) | — |

Features 0, 1 and 2 mostly create disjoint files and can be built in parallel. They meet at three edit points, which must land in order:

- `src/app/_layout.tsx`: Feature 0, then Feature 1.
- `root-stack.tsx`: Feature 1 creates it, then Feature 2 adds one line.
- `(tabs)/(home)/index.tsx`: Feature 0 creates a placeholder, Feature 2 adds the button, Feature 4 adds the proposal panel.

Feature 2 can merge before Feature 3 by stubbing the submit. Feature 3 needs Feature 1 (`owners`, `model/owners.ts`) and Feature 2 (`courseConditions.ts`). Feature 4 needs `ProposalView` from Feature 3.

`convex.config.ts` declares variables a deployment must set. So each feature declares only the variables it uses, and sets them on the deployment before pushing.

Feature 1 must also replace the 10 sample breeds in `JKC_BREEDS` with the full JKC list (about 200), keeping ids stable and filling `en` with the JKC English name. Until that is done, the breed picker only shows the samples.

### Dependencies, configuration and env

- **Add with `bunx expo install`:** `@convex-dev/auth` (0.0.96), `@auth/core` (its peer, ^0.41.1), `valibot` (1.5.0) and `expo-secure-store`. The secure store is required: `ConvexAuthProvider` on React Native needs a `storage`.
- **Convex env** (declared in `convex/convex.config.ts`): `TYPESAFE_API_KEY`, `ORS_API_KEY`, optional `OVERPASS_API_URL`, plus Convex Auth's `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` (from `npx @convex-dev/auth`).
- **App env:** `EXPO_PUBLIC_CONVEX_URL` (already exists). The Google Maps Android key goes in the `react-native-maps` plugin config in `app.json`.
- **First step of Feature 1:** run `bunx convex dev` to regenerate `convex/_generated/`. The sketch's `api.d.ts`, `dataModel.d.ts` and `server.d.ts` (its `Env` type) are hand-written to codegen's shape.

## Best practices

### Convex (Best Practices page)

| Practice | How the sketch follows it |
|---|---|
| Await all promises | Every `ctx.db` and `ctx.scheduler` call is awaited. Enforcement (no-floating-promises) is a Feature 0 lint task, below. |
| Avoid `.filter` on queries | None. Every query uses `.withIndex`. |
| Only `.collect` small results | No `.collect`. `latestProposal` uses `.first()`, `loadOwner` uses `.unique()`, `previousStartPoint` uses `.take(RETAINED_PROPOSAL_COUNT)`, `reachedDailyCap` uses `.take(DAILY_PROPOSAL_CAP)` over a `_creationTime` range of `by_user`, and `dropProposalsBeyondRetention` uses `.take(RETAINED_PROPOSAL_COUNT + 1)`. |
| No redundant indexes | Exactly two: `owners.by_user` and `proposals.by_user`. The daily cap reuses `by_user`, whose implicit `_creationTime` suffix gives the time range. |
| Argument validators on all public functions | All six public functions and both internal ones declare `args`. Return types are TypeScript types, not `returns` validators: optional per the page, and `ProposalView` would duplicate its TS type. |
| Access control on all public functions | Each public function first calls `findOwnerId` or `requireOwnerId` (`convex/model/owners.ts`). `proceed` / `retry` also require the proposal to be the caller's latest. The consistent helper names make `@convex-dev/require-access-control` usable. |
| Only schedule / `ctx.run*` internal functions | `startRun` schedules `internal.proposalRuns.run` and `internal.proposals.record`. The action calls `internal.proposals.loadRun` and `internal.proposals.record`. `api` is never used under `convex/`. |
| Helper functions for shared code | `convex/model/{owners,proposals}.ts`. The public functions are a few lines each. |
| `runAction` only across runtimes | Not used. |
| Avoid sequential `ctx.runQuery` / `ctx.runMutation` in actions | `proposalRuns.run` does one `loadRun`, then external calls, then one `record`. The external side effect between them is the page's documented exception. |
| Sparing `ctx.run*` in queries and mutations | Not used. |
| Table name on `ctx.db` calls | `ctx.db.get('proposals', id)`, `ctx.db.patch('proposals', …)`, `ctx.db.replace('owners', …)`. |
| No `Date.now()` in queries | None. `Date.now()` and `new Date()` appear only in mutations (`saveOwner`, `requestProposal`, `applyOwnerEventToLatest`, `recordRunEvent`) and actions (`proposalRuns.run`, `askJev`). The retry countdown is computed in the app from `retryableAt`. |
| Typed `env` from `convex.config.ts` | `defineApp({ env })` declares every variable, and code reads `env` from `_generated/server`. There is no `process.env`. This reverses the arena's earlier rejection of `defineApp({ env })` as "beta": the Convex best practices recommend it. |

### TypeScript (pstack `typescript-best-practices`)

| Rule | How the sketch follows it |
|---|---|
| Discriminated unions | `ProposalState`, `ProposalEvent`, `CourseScoring`, `RankedCourses`, `ShownCourses`, `RoundTripResult`, `JevResult`, `Session`, `ProposalScreen`. |
| Constructive modeling | `NonEmpty<Course>`. The month is a 1–12 literal union. `failed(building)` must carry its Assessment. `ready` must carry its scoring. |
| Exhaustiveness | `const _exhaustive: never = x;` in every default arm. |
| No `as` casts | One, after validation: `readAnswers` returns `answers as JevAnswers<Qs>` once every asked key has passed its own question's `read`. A mapped generic cannot be built without it. Otherwise `as const` only. |
| Schemas before guards | Valibot `picklist` / `object` / `variant` replace the always-true `vb.custom(() => true)` guards. `isJkcBreedId` checks a `Set` built from the catalog, so it cannot lie. |
| Boundary validation | Forms, Jev, ORS, Overpass and `ConvexError` data in the app are parsed with Valibot. Convex arguments are checked with `v`. |
| Object args | Every function with more than one parameter takes one object. `ctx` helpers take `(ctx, { … })`, the Convex pattern. |
| Structured telemetry | A run failure logs one JSON object: `{ event: 'proposalRunFailed', proposalId, attempt, error }`. |
| `satisfies` over `as` | The catalogs use `as const satisfies`. |

**Deliberate deviation: branded unit types.** The rule asks for branded primitives. Distances, times and timeouts instead carry their unit in the name (`targetDistanceM`, `targetTimeMin`, `CALL_TIMEOUT_MS`), with object arguments so call sites name every value. A brand does not survive a Convex `v` validator round trip, so every read from the database would need an `as`, which breaks the stronger rule above.

### Expo (Expo Skills: `expo-overview`, `expo-router`, `expo-ui`)

| Guidance | How the sketch follows it |
|---|---|
| Install with `npx expo install` | All new dependencies are listed for `bunx expo install`. |
| Read the docs for the project's SDK (57), not `latest` | This needs `docs.expo.dev` in the environment's allowed domains (open). |
| Routes only in `src/app/`; no components there; kebab-case files | Route files are one-line compositions. Components and hooks live in `src/features/*`, with kebab-case names. |
| `Stack` from `expo-router/stack`; `NativeTabs`; `Stack.Protected` | `root-stack.tsx` and `(tabs)/_layout.tsx`. |
| Form sheets with `presentation: 'formSheet'` and a transparent `contentStyle` | The Course Conditions sheet. The transparent background gives liquid glass on iOS 26. |
| `@expo/ui` first for pickers, toggles, form sections; `FlatList` for long lists | Forms use `Host` + `FieldGroup`, `TextInput`, `Picker` (birth year, month, sex) and `Switch` (estimated). The ~200-breed list is a `FlatList`, because `@expo/ui` `List` is not virtualized. Mood chips are custom only because `Picker` items cannot hold icons. |

### Lint enforcement (Feature 0)

These rules are not enforced yet. Feature 0 adds them to oxlint, with no ESLint, so the practices above fail CI instead of relying on review:

- `typescript/no-floating-promises` through oxlint's type-aware mode (`--type-aware`, which needs `oxlint-tsgolint`).
- From `@convex-dev/eslint-plugin`, loaded through oxlint `jsPlugins` (alpha): `no-filter-in-query`, `no-duplicate-indexes`, `require-argument-validators`, `require-access-control` (helpers `findOwnerId` / `requireOwnerId`) and `no-process-env`.
- The `no-restricted-imports` rule for `internal/` and `src → convex`.

`explicit-table-ids` and `no-collect-in-query` need type information, which oxlint's JS plugins do not get, so they stay review-enforced and are listed so in AGENTS.md.

## Implementation notes

These are the specs for the bodies that still throw `not implemented`. They live here, not as comments in the sketch.

### Proposal pipeline (Feature 3)

`askJev`, `toWireRequest`, `readAnswers`, the prompts in `questions.ts`, `requestRoundTrip`, `toRoundTripResult` and `toFailedRoundTrip` are now real code, written from the TypeSafe and ORS docs. The bodies below still throw.

- **First step: check the contracts live, then build the evals.**
  1. With real keys, send one request each to Jev and ORS and compare the responses with `wireResponseSchema` and `roundTripResponseSchema`. In particular, check whether the GeoJSON puts `ascent` under `properties` or `properties.summary` (the schema accepts both), and what a 403 or 429 body looks like.
  2. Write about 20 representative cases under `convex/judge/evals/`: a Dog Profile, Course Conditions and course summaries, each with the expected outcome (a warning should appear, this course should rank first, this course should be marked unsuitable). Run them against Jev, set every threshold and weight in `tuning.ts` from the results, and record the run under [Tuning](#tuning).
- **`findConditionProblems`:** compare each present field with `CONDITION_LIMITS`. Reject `NaN` and `Infinity`.
- **`buildCourseCandidates`:**
  1. `Promise.all` over `FIXED_SEEDS`, calling `requestRoundTrip({ start, requestedLengthM: targetLengthM * ROUND_TRIP_OVERSHOOT_COMPENSATION, seed })`.
  2. If every result is `unavailable`, return `routingUnavailable`. If there is no `loop` at all, return `noLoopFound`.
  3. Drop near-duplicate loops: distance within ±3% and more than 80% shared vertices.
  4. Make one `fetchSurroundings(boundingBoxOf(all loop paths))` call.
  5. Build `toCourse({ loop, surroundings })` per loop.
- **`requestRoundTrip`** (ORS) is written. What it relies on, from the ORS docs and source:
  - `POST /v2/directions/foot-walking/geojson`, `Authorization: <key>` with no `Bearer`, one `[lng, lat]` coordinate, `options.round_trip` (`length` is a preference, not a promise), `instructions: false` to shrink the payload, and `extra_info: ['surface']` only.
  - Errors are classified by the body's `error.code`, not the HTTP status: a failed round trip is 2099 with HTTP 500, and a Start Point more than 350 m from a walkable way is 2010 with HTTP 404. 2004, 2009, 2010 and 2099 mean `noRoute`, because retrying cannot help. Anything else (a 403 daily-quota body, 429, 503, a network error, a timeout or an unparsable body) means `unavailable`.
  - `unpavedShare` is the share of path length whose `surface` id is unpaved. Unknown (0) counts as paved, because Japanese OSM data leaves most urban ways untagged.
  - ORS's `green` and `noise` extras and its `green` / `quiet` weightings are not used: their coverage of Japan is undocumented, and Overpass already supplies the surroundings (ADR 0004).
- **`fetchSurroundings`** (Overpass):
  - `POST` to `env.OVERPASS_API_URL ?? PUBLIC_OVERPASS_API_URL` with the query below, an app-identifying `User-Agent` (fair use) and `AbortSignal.timeout(CALL_TIMEOUT_MS.overpass)`.
  - Query: `[out:json][timeout:20]; (way[leisure~"^(park|garden)$"](bbox); way[landuse~"^(grass|forest|recreation_ground)$"](bbox); way[highway~"^(trunk|primary|secondary)$"](bbox);); out geom;`
  - Any failure returns `null`.
- **`boundingBoxOf`:** the min/max over all points, padded by about 100 m.
- **`toCourse`:**
  - `greenShare`: the share of length on segments whose midpoint is inside any green ring.
  - `mainRoadShare`: the share of length within `MAIN_ROAD_PROXIMITY_M` of a main road.
  - `path`: Douglas–Peucker simplified to `MAX_PATH_POINTS` or fewer, keeping both endpoints.
- **`askJev`** is written. What it relies on, from the TypeSafe docs:
  - `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer <TYPESAFE_API_KEY>` and a body of `{ state, model, questions }`, where each question is `{ type, instructions, criteria }`. `instructions` may be a string or an object.
  - The model is pinned to `jev-1.13.0`, because `jev-latest` moves and the thresholds are tuned against one version.
  - Answers: Noul `{ noul }` (no confidence), Choice `{ choice, probabilities, confidence }`, Score `{ score, probabilities, confidence }`, where `score` is the probability-weighted level index from 0 to n − 1.
  - One retry on 408, 429 or 529, honoring `retry-after` only while it fits inside `CALL_TIMEOUT_MS.jev`. Anything else fails at once, and the caller falls back.
  - The plain `fetch` stays in Convex's default runtime. The JavaScript SDK documents Node 20+, and running it in the default runtime is unverified.
- **The prompts** (`questions.ts`) are written, following TypeSafe's guidance:
  - English `instructions` and `criteria` (ADR 0005). The Owner's own text stays Japanese in `state`.
  - Choice options list the neutral answer first, because Jev favours the first option (`optionsNeutralFirst`).
  - Numbers reach Jev as words (`courseSummary`: "2.3 km, about 35 minutes at this dog's pace", "a few gentle slopes (about 20 m of climbing)", "about half of the route"), because Jev is weak at numeric precision. Missing surroundings read "unknown", not zero.
  - Fit questions carry their course inside a structured `instructions` object, and `state` holds only `{ dog, today }`, because Jev does worse with indirection and with state full of other candidates.
  - Per course: a Body Fit Score, a Mood Fit Score only with a Mood, and an `unsuitable` Noul. Five courses make at most 15 questions in one request, well within the 64k-token context.
- **Jev failure logging:** log the `JevFailure` for tuning, and never surface it to the Owner.
- **Daily cap and retention** are written in `model/proposals.ts`: `request` refuses with `ConvexError({ kind: 'dailyLimitReached' })` once the Owner has `DAILY_PROPOSAL_CAP` proposals in the last `DAILY_PROPOSAL_WINDOW_MS` (a double tap on an in-flight proposal still returns `{ kind: 'alreadyWorking', proposalId }` first), and each new proposal deletes the one beyond `RETAINED_PROPOSAL_COUNT`. Retries are not counted; the cooldown limits them.

### Account and Dog Profile (Feature 1)

- **`findOwnerProblems`:** checks the following.
  - The names and the other-breed text are non-empty after trimming, and within the limits.
  - A JKC breed passes `isJkcBreedId`.
  - The year is at least `earliestBirthYear`, and the Birth Month is not after `now`.
  - The weight and the memo are within the limits.
- **`token-storage.ts`:** `expo-secure-store`'s `getItemAsync` / `setItemAsync` / `deleteItemAsync`.
- **`SignInForm`:**
  - `useAuthActions().signIn('password', { email, password, flow })`.
  - Convex Auth errors (`InvalidAccountId`, `InvalidSecret`, account exists) map to one Japanese message.
  - Built from `@expo/ui` `Host`, `TextInput` and `Button`.
- **`emptyDogProfileDraft`:**
  - Names, weight and memo are empty strings.
  - Breed and sex are null.
  - The Birth Month is `now`'s year and month, with `estimated: false`.
- **`draftFromOwner`:** the inverse of the schema's transform.
- **`DogProfileForm`:**
  - Fields: `TextInput` ×2, the breed row, `BirthMonthRows`, sex `Picker`, weight (decimal pad) and Dog Memo (multiline), inside `FieldGroup`s. The submit button sits in its own last section, whose footer shows 「保存しました」, 「入力内容を確認してください」 or 「保存できませんでした」.
  - Submit: `parseDogProfileDraft`, then `api.owners.save({ owner })`.
- **`BreedPicker`:** a React Native `Modal` rendered outside the form's `Host`, with a search box over `searchBreeds` and a `FlatList` of rows. The form row 「犬種」 opens it. Choosing その他 reveals a text input.
- **`BirthMonthRows`:** two labeled `@expo/ui` `Picker` rows (year from `earliestBirthYear` to this year; month from `MONTHS`, with future months disabled) and a `Switch` 「推定」.
- **`searchBreeds`:**
  - Normalise: NFKC, then katakana to hiragana, then strip "・" and spaces (keep "ー").
  - Order: prefix matches first, then substring matches, in catalog order.
  - ミックス and その他 are always last.
- **`parseForm`:** `vb.safeParse`. On failure, return the first message per top-level key from `vb.flatten(issues).nested`.
- **Profile tab:** `DogProfileForm initial={session.owner}`, and sign-out via `useAuthActions().signOut` (hooks at the top level).

### Course Conditions and display (Features 2 and 4)

- **`CourseConditionsForm`:**
  - The draft comes from `draftFromConditions(initial)`, or `EMPTY_CONDITIONS_DRAFT`.
  - Fields: `MoodChips`, Today's Memo, distance (km) and time (min), and `StartPointRows`.
  - Submit: `parseConditionsDraft`, with errors shown inline. Otherwise `requestProposal`; on `ok`, `onRequested()`, and on a refusal, `REFUSAL_LABELS[refusal]` inline.
  - The button is disabled while pending.
- **`MoodChips`:**
  - A horizontal `FlatList` of `MOOD_IDS`, hosted in the form through `RNHostView`. Each chip is a `SymbolView` of `MOOD_CHIPS[id].symbol` plus `MOOD_CHIPS[id].label`, with `accessibilityRole="radio"`.
  - Tapping the selected chip clears it.
- **`getDeviceLocation`:**
  - Call `requestForegroundPermissionsAsync`. If permission is not granted, return `null`.
  - Otherwise race `getCurrentPositionAsync({ accuracy: Balanced })` against `DEVICE_LOCATION_TIMEOUT_MS`, falling back to `getLastKnownPositionAsync({ maxAge: 10 min })`.
  - It never throws.
- **`StartPointRows`:**
  - 「現在地」 calls `getDeviceLocation()`, with a toast when the result is null.
  - A `MapView` (initial region: the value, or `DEFAULT_POINT`) drops a pin on long-press. 「クリア」 clears it.
  - When empty, the hint reads `未指定のときは現在地 → 前回の開始地点 → ${DEFAULT_POINT_NAME} の順に使います`.
- **Home:** the 「コースを提案してもらう」 button wraps every phase and is hidden while `working`.
- **`CourseMap`:**
  - `PROVIDER_GOOGLE` on Android, `PROVIDER_DEFAULT` on iOS.
  - A tappable `Polyline` per course, and a `Marker` at the Start Point.
  - `fitToCoordinates` runs when the selection changes.
- **`ReadyView`:** the map plus a switcher showing distance, `estimatedMinutes` and `REASON_LABELS[reason]`, with `UNSUITABLE_LABEL` on an unsuitable course and `allUnsuitableNotice(dogName)` above the switcher when `allUnsuitable`. When `byLength`, `BY_LENGTH_NOTICE` shows instead. The `START_POINT_NOTES[source]` line shows in both orders.
- **`FailedView`:** `FAILURE_LABELS[reason]` and a retry button that stays disabled, showing `retryCountdownLabel(seconds)`, until `retryableAt` (counted down on the device).

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

- **Its invariants are code, not prose.**
- **It has the most precise failure type.** `failed(checking)` and `failed(building)` are separate variants.
- **Its failures are values.** `JevResult` cannot be ignored.
- **It leaves no starter file edited**, and its feature folders keep Features 0–2 disjoint.

**Grafts**, folded in by hand:

| From | Graft | Why |
|---|---|---|
| C4, C10 | `owners` table with the Dog Profile embedded; the Owner's name on the Owner | One dog per Owner and "onboarded" become structural. It also matches GLOSSARY. |
| C1, C3 | Breed id stored as `v.string()`, checked by `isJkcBreedId` | It avoids a 200-literal schema union, and adding breeds needs no schema push. |
| C1, C3, C10 | `proposals.current` (the latest proposal) instead of `get(id)` plus a `/proposal/[id]` route | No proposal id in app state, so a restart or tab switch loses nothing. |
| C1 | `request` returns the in-flight proposal's id while one is working | A double tap cannot spend ORS quota twice. |
| C3 | `useProposal` returns a phase union whose `proceed` / `retry` exist only where valid | Calling them in the wrong phase is a compile error. |
| C3, C10 | Dog Profile snapshot on each proposal (`dogSnapshot`) | Retry and confirm judge the same dog the Owner asked about. |
| C3 | Typed env via `defineApp({ env })` | First rejected as beta, then adopted because the Convex best practices recommend it. |
| C4 | `convex/domain/tuning.ts` | Every product-tuning placeholder is in one place. |
| C5 | The previous Start Point skips proposals that used the Default Point | "Previous" means a place the Owner was. |
| C7 | One Jev request scoring all five courses | One HTTP call instead of five, and all-or-nothing scoring by construction. |
| C10 | Fixed ORS seeds | Retries are repeatable. |
| C1 | The `internal/` folder convention, plus an oxlint rule | Internals become unimportable from outside their module. |
| Judge, verifier | Per-call timeouts with a derived run timeout; `proceed` / `retry` only on the latest proposal; Too-much-load always asked; single-sourced labels | Found by the cross-judge and in Phase F verification. |

**Rejected:**

| From | Rejected | Why |
|---|---|---|
| C3, C10 | Fail the proposal when Overpass fails | The spec makes only routing fatal, so Overpass degrades to unknown surroundings. |
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

**Verification (Phase F).** A separate Opus reviewer checked the synthesis. It found:

- two runs could spend ORS quota at once
- an overstated "Features 0–2 are disjoint" claim
- a missing Score wire variant
- a load check that was skipped when no targets were given
- two hand-synced labels

All of these are fixed.

## No-comments pass

pstack's `/no-comments` ran Comment Sicko over `sketch/` (generated files excluded).

**Deletions.** It deleted 756 comment lines: module headers, banners, narration, usage blocks and the `// TODO` pseudocode. It also stripped 18 trailing comments. All deletions were accepted, and none were restored.

**Where the pseudocode went:**

- **Into code.** `advance`, `isWorking`, `rankCourses`, `toProposalView`, `targetLengthM`, `estimateMinutes`, `ageInMonths`, `judgeConditions`, `judgeCourseFits`, the thin Convex functions and the `model/` helpers, and both form schemas.
- **Into prose.** Everything else moved to [Implementation notes](#implementation-notes).

**What survived.** Only doc comments that state a public contract, such as "null when signed out" and "never rejects for a Jev problem".

**The 11 `MUST KILL` flags:**

| # | Flag | Resolution |
|---|---|---|
| 1 | `moodLabel` had a dead fallback | `MOOD_LABELS: Record<Mood, string>`; `moodLabel` deleted. |
| 2 | `interpretFit` had an unreachable throw | Throw deleted. Fit question keys are template-literal typed. `hasMood` is passed in so the Mood Fit read is truthful, and `askJev` guarantees every asked answer. |
| 3 | `requestRoundTrip`'s null-vs-reject contract was prose-only | `RoundTripResult = loop \| noRoute \| unavailable`; `RoutingUnavailable` class deleted. |
| 4 | `REQUESTED_LENGTH_FACTOR` named no reason | Renamed `ROUND_TRIP_OVERSHOOT_COMPENSATION`, the ORS quirk it compensates for. It stays a placeholder until measured. |
| 5 | Timeouts had to fit the run timeout, prose-only | `RUN_TIMEOUT_MS` is derived from `CALL_TIMEOUT_MS`. |
| 6 | `startPoint` meant "Owner's choice", prose-only | Renamed `chosenStartPoint`. |
| 7 | `month` was 1-based, prose-only | 1–12 literal union (`MONTHS`). |
| 8 | Length-class ranges lived in comments | `LENGTH_CLASSES` data (`upToM`, `representativeM`). |
| 9 | "Never rename JKC ids" was prose-only | **Open.** It needs a snapshot test, and the repo has no test runner yet. Feature 1 adds it with the full list. |
| 10 | `proposals.dog` was a snapshot, prose-only | Renamed `dogSnapshot`. |
| 11 | Score level order and position meaning were prose-only | `levelsWorstToBest` and `positionTowardBest`. |

The guessed or unverified wire schemas are named so (`guessedWireResponseSchema`, `unverifiedOrsResponseSchema`) instead of being marked by comments.

### Second pass (after the docs revision)

Comment Sicko ran again over the files the docs revision changed. It deleted 17 comment lines (11 comments) and kept the two `judge/index.ts` contracts ("never rejects for a Jev problem"). All deletions were accepted. Its `MUST KILL` flags:

| Flag | Resolution |
|---|---|
| `courseValidator.surroundings` used `null` for "Overpass was down" | `{ kind: 'unknown' } \| { kind: 'known', greenShare, mainRoadShare }` |
| `courseValidator` path and share rules were prose-only (brand `Course`, a `Fraction` type) | **Rejected:** brands do not survive a Convex `v` round trip (see the deliberate deviation above). `MAX_PATH_POINTS` and the [0, 1] shares stay enforced by `toCourse`. |
| `fitValidator` field meanings were prose-only | Renamed `bodyPositionTowardBest`, `moodPositionTowardBest`, `unsuitableProbability` |
| `advance` returned a silent `null` | `Transition = { kind: 'advanced', … } \| { kind: 'ignored' }`; `INITIAL_TRANSITION` became `INITIAL_STATE` |
| `ShownCourses` order and non-emptiness were prose-only | Field renamed `bestFirst`. **`NonEmpty` rejected:** the courses come from a `v.array`, so the tuple would need a cast or a "never happens" throw. |
| `requestProposal` hid whether it scheduled anything | Returns `{ kind: 'started' \| 'alreadyWorking', proposalId }` |
| `applyOwnerEvent` silently ignored a non-latest proposal | Renamed `applyOwnerEventToLatest` |

## Tradeoffs accepted

- **A persisted proposal, a scheduler and a watchdog**, which add more moving parts than an action that returns its result. In exchange, confirm and retry resume without redoing work, progress is reactive, and a proposal survives the app being backgrounded.
- **All 5 courses' paths are stored**, capped at `MAX_PATH_POINTS` each. In exchange, ranking stays a read-time derivation.
- **One Jev request for all five courses' Fit.** In exchange, there is one HTTP call and all-or-nothing scoring by construction. If quality degrades with five courses in one state, only `judgeCourseFits` and `fitQuestions` change.
- **Walking Pace is always asked**, even when Target Distance is given. In exchange, every time estimate uses the dog's own pace, and a resume never needs a second Jev round.
- **Jev reads English, the Owner reads Japanese** (ADR 0005). Mood has a Japanese label in the app and an English description on the server; Breed carries both `ja` and `en`. In exchange, prompts are in Jev's strongest language.
- **The length class is asked even when a target was given.** In exchange, the Condition Check is one request whatever the Owner entered (TypeSafe's speculative fan-out).
- **One validated `as` cast** in `readAnswers`. In exchange, every caller gets answers typed by its own questions.
- **An Overpass failure degrades** (`surroundings: { kind: 'unknown' }`) instead of failing the proposal.
- **De-duplication can leave fewer than 5 candidates.** At least one loop is required; otherwise the proposal fails with `noLoopFound`.
- **Home shows only the latest proposal.** Older ones stay in the table, unseen, because they are needed to derive the previous Start Point.
- **Units are in names, not brands** (see [TypeScript](#typescript-pstack-typescript-best-practices)).
- **The sketch lives in `docs/blueprint/sketch/`, not at its real paths.** In exchange, the repo builds and lints cleanly until each feature copies its files in.

## Alternatives considered

- **The action returns directly, and the app orchestrates.** This exposes the pipeline's stages to the caller, makes the app hold in-progress state across backgrounding, and forces the server either to trust a client-supplied Assessment or to re-ask Jev.
- **One `propose({ acceptWarnings })` action, called twice.** Either the Condition Check runs again, or a cache is needed, which is the persisted document by another name.
- **A persisted pipeline with one scheduled action per stage plus a `courseCandidates` table.** This is temporal decomposition, with more fencing points and cross-table invariants for no user-visible gain.
- **Ranking stored at write time.** Changing the weights would mean re-running Jev or migrating data.

## Open questions and risks

- **ORS quota.** 2,000 requests a day and 40 a minute, at 5 calls per proposal, is about 400 proposals a day and 8 a minute app-wide. The per-Owner cap (10 a day) and the retry cooldown bound one Owner's share; the app-wide ceiling is still the free plan's.
- **Live contracts.** The Jev and ORS shapes come from docs and source. The first Feature 3 step checks them against real responses.
- **Tuning.** Every value in `tuning.ts` is a placeholder until the Feature 3 evals set it.
- **Prompt steering.** Jev does not treat `state` as hostile, so a memo can steer its own proposal's judgments. Only the Owner's own result is affected.
- **Retention and privacy.** Each Owner keeps at most `RETAINED_PROPOSAL_COUNT` proposals with their Start Points. The memos go to TypeSafe, which retains them outside its enterprise plan (ADR 0006).
- **oxlint `jsPlugins` is alpha.** If it cannot load `@convex-dev/eslint-plugin`, Feature 0 falls back to a scoped ESLint config for `convex/` and says so in AGENTS.md.
- **JKC id stability.** It is not enforced until Feature 1 adds a snapshot test.

## Docs revision (TypeSafe and OpenRouteService)

The first blueprint was written without access to docs.typesafe.ai or the ORS docs. A second `/grill-with-docs` session read both, applied the `typesafe-ai` skill to `judge/`, and settled these with the operator:

| Topic | Before | Now | Why |
|---|---|---|---|
| Jev wire format | `guessedWireResponseSchema` | `toWireRequest`, `wireResponseSchema` and per-question `read` | Taken from the API docs |
| Jev model and env | `JEV_API_URL`, `JEV_API_KEY`, no model | Fixed URL, `JEV_MODEL = 'jev-1.13.0'`, `TYPESAFE_API_KEY` | `model` is required; `jev-latest` moves under tuned thresholds |
| Jev client | Not decided | Plain `fetch` in the default runtime | The SDK documents Node 20+ |
| Jev retries | Any non-2xx falls back | One retry on 408 / 429 / 529 within the call timeout | TypeSafe's error guidance |
| Prompt language | Japanese | English, with the Owner's text in Japanese (ADR 0005) | English is Jev's primary language |
| Mood and Breed for Jev | Japanese labels in `domain/` | `MOOD_FOR_JEV`, `JKC_BREEDS[].en` | Follows ADR 0005 |
| Choice option order | Unspecified | Neutral first (`optionsNeutralFirst`) | Jev favours the first option |
| Targets consistency | A Jev Noul | `targetsAreConsistent` in code | It is arithmetic |
| Length class | Asked only when judged | Always asked, used only when judged | Speculative fan-out |
| Course state | Numbers, all courses in `state` | Words, each course inside its own question | Numeric precision and indirection are Jev weak spots |
| Serious problems | Hidden by weighting | `unsuitable` Noul; such courses rank last | Weighted scores cannot express "any serious violation" |
| Body Fit | One Score | Still one Score | Split only if the evals show a need |
| Thresholds | Placeholders | Set by evals in `convex/judge/evals/` | Cookbook thresholds are examples, not rules |
| ORS errors | 404 vs 5xx | By `error.code` (2004 / 2009 / 2010 / 2099 → `noRoute`) | Round-trip failures are 2099 with HTTP 500; the daily quota is 403 |
| ORS extras | `surface`, `waycategory`, `steepness` | `surface` only, Unknown as paved; `instructions: false` | Fewer, documented fields |
| ORS green / noise | Not considered | Not used; Overpass stays | Japan coverage undocumented (ADR 0004) |
| Retry spacing | Open | `RETRY_COOLDOWN_MS` after `failedAt` | The ORS minute quota is a sliding 60 s window |
| Proposal volume | Open | `DAILY_PROPOSAL_CAP` per Owner | The ORS daily quota is app-wide |
| Retention | Open | Keep the latest `RETAINED_PROPOSAL_COUNT` | Start Points are locations |
| Memos to Jev | Open | Sent; the Owner's name is not (ADR 0006) | Body Fit needs them |
| Lint hosting | Open | oxlint only; two type-aware Convex rules review-enforced | Convex docs on oxlint support |

## Tuning

Nothing has been measured yet. The Feature 3 evals record here which cases were run, against which `JEV_MODEL`, and which values they set.

## Next implementation step

Unit-test the pure code that already exists (`advance`, `rankCourses`, `toProposalView`, `targetLengthM`, `targetsAreConsistent`, `estimateMinutes`, `ageInMonths`, `resolveStartPoint`, `readAnswers`, the question builders, `toRoundTripResult`, `toFailedRoundTrip`, `pathLengthM`). Every Feature 3 and 4 path depends on it. Features 0–2 can start in parallel.

## Typecheck

The sketch was type-checked and linted at its real paths in a clean worktree of this branch, with `@convex-dev/auth` 0.0.96, `@auth/core` 0.41 and `valibot` 1.5.0 in `node_modules`.

`bunx tsc --noEmit` reported only the two pre-existing starter errors, which Feature 0 removes:

```
src/components/animated-icon.web.tsx(5,21): error TS2307: Cannot find module './animated-icon.module.css' …
src/constants/theme.ts(6,8): error TS2882: Cannot find module or type declarations for side-effect import of '@/global.css'.
```

`bunx oxlint convex src` reported only the starter's existing errors (`themed-view.tsx` unused parameters, and `use-color-scheme.web.ts`).

**After the docs revision**, the npm registry was unreachable, so `node_modules` could not be installed and the real tsc and oxlint did not run. Instead:

- `convex/domain`, `convex/judge` and `convex/courseBuilder` (18 files) were type-checked with TypeScript 6.0.2 against hand-written stubs of `valibot` and `convex/values`. No errors.
- The same files were compiled and run against runtime stubs to check `advance` (the retry cooldown), `targetsAreConsistent`, `rankCourses` (unsuitable courses last), the Choice option order, `readAnswers` (a missing or wrong-kind answer is `malformed`), `interpretFit`, `toRoundTripResult` (`unpavedShare`) and `toFailedRoundTrip`. All passed. Valibot's own parsing was not exercised.
- `src/` changes (labels, hooks, view props) were not type-checked. Re-run the real `bunx tsc --noEmit` and `bunx oxlint` once dependencies install.

`convex codegen` needs a deployment, so `sketch/convex/_generated/{api,dataModel,server}.d.ts` are hand-written to codegen's templates. The `Env` type in `server.d.ts` mirrors `convex.config.ts`. `bunx convex dev` regenerates all three.
