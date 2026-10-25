---
name: verify-proposal-lifecycle
description: Check the Proposal lifecycle on Home. Use when a change touches advance, recordRunEvent, loadRunInput, commit, startRun, proposalRuns.run, proceed, retry, or the Proposal phase union. An older attempt must not change Home, a Condition Check warning must wait for confirmation, retry must resume the phase that failed, and the retry countdown must hold.
---

# Verify the Proposal lifecycle

Home shows one Proposal. A run from an attempt other than that Proposal's current attempt must not change what Home shows. If it does, Home can show a failure or courses from a run the Owner has already left, and the current run's result is then dropped.

The same check also holds three clauses of the same reducer. A Condition Check warning must leave Home asking for confirmation, not building or showing courses. Retry after a failed check must check again, and retry after a failed build must continue that build with the same assessment. The failure screen must stay up until the retry countdown finishes.

## When a change touches this

Compare the diff with the sync commit below. Re-run the check when any of these change:

- `convex/domain/proposal.ts`: `advance`, `retryableAt`, `INITIAL_STATE`, `proposalStateValidator`
- `convex/model/proposals.ts`: `requestProposal`, `recordRunEvent`, `applyOwnerEventToLatest`, `loadRunInput`, `commit`, `startRun`
- `convex/proposalRuns.ts`: `run` (the `loadRun` lookup and the `record` that follows it)
- `convex/proposals.ts`: `proceed`, `retry`, `record`
- `convex/domain/tuning.ts`: `RETRY_COOLDOWN_MS`
- `convex/schema.ts`: the `proposals.state` field

A diff only in Jev prompts, ORS, Overpass, or ranking does not by itself need this check.

## Run

```bash
bun verification/proposal-lifecycle/check.ts
```

Exit 0 means both parts hold. The script needs Bun, and Java 11 or newer as `java` on `PATH` (OpenJDK 21 was used when this was written). It runs TLC 1.7.4. Set `TLA2TOOLS` to a `tla2tools.jar` with sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, or let the script download that jar into the user cache and check the checksum. Set `JAVA` to choose the binary.

The script prints two lines. The `Code:` line is an exhaustive walk of the real functions. The `TLC` line is the model in `verification/proposal-lifecycle/Proposal.tla`, checked with `Proposal.cfg`.

## Read a failure

The `Code:` walk calls `requestProposal`, `loadRunInput`, `recordRunEvent`, and `applyOwnerEventToLatest` with a fake database and clock. It does not call Jev, ORS, or Overpass. A failure names the rule and a numbered path in Home's words.

- `Code:` fails: the functions broke the rule. Replay that path. Leave the rule as it is. Do not change the model so the walk passes.
- `Code:` passes and TLC fails: the model and the code disagree, or the model allows a step the walk does not take. Read the TLC result with the pstack `/statechart` skill. Fix the model so it describes the code, unless the walk missed a real step, in which case fix the walk.
- Both fail on the same rule: treat the `Code:` path as the bug. Use `/statechart` to see the shortest path in the model.
- A thrown error from a legal tap or a scheduled report is a failure of the walk. The fake database does not apply Convex's schema validator, so a next state the table cannot store shows up as Home changing. If you need to know whether a deployment would reject the write, compare that state with `proposalStateValidator`.

Passing covers the walk and the model up to the bound below. It does not cover the whole app.

When the check passes, `/statechart` draws how Home moves. When TLC reports an invariant violation, `/statechart` shows the shortest path in plain words, and which of those violations a change fixes. Its commands differ by release. Do not copy them from another machine. The reader labels live in `verification/proposal-lifecycle/Proposal.map.mjs`.

## Bound

`MaxAttempt` in `Proposal.cfg` is 3. The walk reads that number and stops expanding once `attempt` passes it. Three attempts are the insert plus two starts. The code does not branch on the attempt number. The countdown is one step of `RETRY_COOLDOWN_MS` (60 seconds), not every millisecond. A checking run reports a warning (`tooMuchLoad`), no warning, or `internal` failure. A building run reports `byLength` courses or `internal` failure. The watchdog is the `timedOut` record `startRun` schedules. The walk splits the run's lookup from its report, so a timeout or a retry can land between them.

Left out: a second Proposal, the daily cap, retention, `proceed` or `retry` aimed at a Proposal that is not the latest, the text of a warning, pace and length inside the assessment, ranking, the start point, and the bodies of `judgeConditions` and `buildCourseCandidates`. `「条件を変える」` sends no event.

## Keep it true

Each action in `Proposal.tla` cites the file and line of the guard it stands for. One action is one mutation or one lookup: `loadRun`, `record`, `proceed`, or `retry`. Move the sync commit forward only after you have re-read those lines at the new commit and the model still describes them. An intended lifecycle change updates the model and the walk together, then the sync commit. A bug stays a failing check.

Sync commit: `SYNC_COMMIT`

## Shown to fail

These edits were applied on the real functions, the check failed, and the edits were removed. Current code passes: the walk's `Code:` line and TLC both hold.

- Drop `doc.attempt !== attempt` in `recordRunEvent`. `StaleIgnored` fails. You ask for a proposal, the run reads it, the condition check finds no warning, a timeout arrives. Home goes from building the course to build failed. The timeout is still attempt 1. Home is on attempt 2.
- Change `warnings.length > 0` in `advance` to `warnings.length < 0`. `WarningGate` fails. The condition check finds a warning and Home is building the course.
- Make the failed-build arm of `retryRequested` return `{ phase: 'checking' }`. `RetryResumes` fails. No warning, the build times out, the countdown finishes, you tap `もう一度試す`. Home is checking the conditions on attempt 3, not building.
- Remove `now < retryableAt(state)` from `retryRequested`. `Countdown` fails. The check times out and a retry arrives during the countdown. Home leaves the failure screen. The failure screen's button is disabled during the countdown. The check calls the same model function as `proposals.retry`.

After a later edit that touches the covered files and does not re-run this check, use `/maintain-formal-verification-skill` to bring the verification back in line.
