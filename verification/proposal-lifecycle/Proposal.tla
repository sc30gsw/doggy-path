---- MODULE Proposal ----
\* One Proposal, from the insert in requestProposal through Home.
\* convex/model/proposals.ts requestProposal, recordRunEvent, applyOwnerEventToLatest.
\* convex/domain/proposal.ts advance.
\*
\* Left out: a second Proposal, the daily cap, retention, and proceed or retry aimed
\* at a Proposal that is not the latest. The assessment is only whether it has a
\* warning. Failure reasons are one outcome. Jev, ORS, and Overpass are not in the
\* model. The clock is the countdown running, or finished, after RETRY_COOLDOWN_MS.
\* Attempt stops at MaxAttempt. 「条件を変える」 sends no event.

EXTENDS Integers

CONSTANT MaxAttempt
ASSUME MaxAttempt \in Nat /\ MaxAttempt >= 1

VARIABLES phase, warnings, attempt, countdown, runStatus, watchdog, staleWrote, badRetry

vars == <<phase, warnings, attempt, countdown, runStatus, watchdog, staleWrote, badRetry>>

Att == 1..MaxAttempt
Phases == {
  "checking",
  "awaitingConfirmation",
  "building",
  "ready",
  "failedChecking",
  "failedBuilding"
}
Warning == {"none", "pending", "acked"}
Run == {"none", "scheduled", "loadedChecking", "loadedBuilding"}
Clock == {"idle", "running", "done"}

TypeOK ==
  /\ phase \in Phases
  /\ warnings \in Warning
  /\ attempt \in Att
  /\ countdown \in Clock
  /\ runStatus \in [Att -> Run]
  /\ watchdog \in [Att -> BOOLEAN]
  /\ staleWrote \in BOOLEAN
  /\ badRetry \in BOOLEAN

\* Home never builds or shows a course while a Condition Check warning is still waiting for the Owner.
WarningGate == warnings /= "pending" \/ phase = "awaitingConfirmation"

\* A report from an attempt other than the Proposal's current attempt never changes Home.
StaleIgnored == staleWrote = FALSE

\* Retry after a failed check checks again, and retry after a failed build continues that build.
RetryResumes == badRetry = FALSE

\* The failure screen stays up until the retry countdown finishes.
Countdown == countdown /= "running" \/ phase \in {"failedChecking", "failedBuilding"}

\* Home does not sit on the check or the build after that run has already reported.
RunOpen ==
  phase \notin {"checking", "building"}
  \/ runStatus[attempt] \in {"scheduled", "loadedChecking", "loadedBuilding"}

\* Home does not sit on the check or the build with no timeout left to stop it.
WatchdogArmed == phase \notin {"checking", "building"} \/ watchdog[attempt]

\* convex/model/proposals.ts:84 insert, attempt 1, INITIAL_STATE checking.
\* convex/model/proposals.ts:92 startRun schedules the run and the watchdog.
Init ==
  /\ phase = "checking"
  /\ warnings = "none"
  /\ attempt = 1
  /\ countdown = "idle"
  /\ runStatus = [a \in Att |-> IF a = 1 THEN "scheduled" ELSE "none"]
  /\ watchdog = [a \in Att |-> a = 1]
  /\ staleWrote = FALSE
  /\ badRetry = FALSE

\* convex/proposalRuns.ts:14 loadRun returned a checking or building input.
LoadRun(a) ==
  /\ runStatus[a] = "scheduled"
  /\ a = attempt \* convex/model/proposals.ts:126
  /\ phase \in {"checking", "building"} \* convex/model/proposals.ts:129
  /\ runStatus' = [runStatus EXCEPT ![a] =
       IF phase = "checking" THEN "loadedChecking" ELSE "loadedBuilding"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

\* convex/proposalRuns.ts:14 the run returns without reporting.
RunFindsNothing(a) ==
  /\ runStatus[a] = "scheduled"
  /\ ~(a = attempt /\ phase \in {"checking", "building"}) \* convex/model/proposals.ts:126
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

\* convex/domain/proposal.ts:126 assessed, no warnings, startRun.
ReportNoWarning(a) ==
  /\ runStatus[a] = "loadedChecking"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "checking" \* convex/domain/proposal.ts:119
  /\ phase' = "building"
  /\ warnings' = "none"
  /\ countdown' = "idle"
  /\ staleWrote' = staleWrote
  /\ badRetry' = badRetry
  /\ attempt < MaxAttempt
  /\ attempt' = attempt + 1 \* convex/model/proposals.ts:200
  /\ runStatus' = [runStatus EXCEPT ![a] = "none", ![attempt + 1] = "scheduled"]
  /\ watchdog' = [watchdog EXCEPT ![attempt + 1] = TRUE] \* convex/model/proposals.ts:209

\* convex/domain/proposal.ts:120 warnings, stay for confirmation, no new run.
ReportWarning(a) ==
  /\ runStatus[a] = "loadedChecking"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "checking" \* convex/domain/proposal.ts:119
  /\ phase' = "awaitingConfirmation"
  /\ warnings' = "pending"
  /\ attempt' = attempt \* convex/model/proposals.ts:200
  /\ countdown' = countdown
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<watchdog, staleWrote, badRetry>>

\* convex/domain/proposal.ts:141 built, attempt unchanged.
ReportBuilt(a) ==
  /\ runStatus[a] = "loadedBuilding"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "building" \* convex/domain/proposal.ts:139
  /\ phase' = "ready"
  /\ warnings' = warnings
  /\ attempt' = attempt \* convex/model/proposals.ts:200
  /\ countdown' = countdown
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<watchdog, staleWrote, badRetry>>

\* convex/domain/proposal.ts:146 failed during checking.
RunFailsCheck(a) ==
  /\ runStatus[a] = "loadedChecking"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "checking" \* convex/domain/proposal.ts:146
  /\ phase' = "failedChecking"
  /\ warnings' = "none"
  /\ countdown' = "running" \* convex/domain/proposal.ts:184
  /\ attempt' = attempt
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<watchdog, staleWrote, badRetry>>

\* convex/domain/proposal.ts:153 failed during building.
RunFailsBuild(a) ==
  /\ runStatus[a] = "loadedBuilding"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "building" \* convex/domain/proposal.ts:153
  /\ phase' = "failedBuilding"
  /\ warnings' = warnings
  /\ countdown' = "running" \* convex/domain/proposal.ts:184
  /\ attempt' = attempt
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<watchdog, staleWrote, badRetry>>

\* convex/model/proposals.ts:210 the same record as a run, reason timedOut.
WatchdogFailsCheck(a) ==
  /\ watchdog[a]
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "checking" \* convex/domain/proposal.ts:146
  /\ phase' = "failedChecking"
  /\ warnings' = "none"
  /\ countdown' = "running" \* convex/domain/proposal.ts:184
  /\ attempt' = attempt
  /\ watchdog' = [watchdog EXCEPT ![a] = FALSE]
  /\ UNCHANGED <<runStatus, staleWrote, badRetry>>

WatchdogFailsBuild(a) ==
  /\ watchdog[a]
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase = "building" \* convex/domain/proposal.ts:153
  /\ phase' = "failedBuilding"
  /\ warnings' = warnings
  /\ countdown' = "running" \* convex/domain/proposal.ts:184
  /\ attempt' = attempt
  /\ watchdog' = [watchdog EXCEPT ![a] = FALSE]
  /\ UNCHANGED <<runStatus, staleWrote, badRetry>>

\* convex/domain/proposal.ts:166 failed is ignored once Home has left the run.
WatchdogIgnored(a) ==
  /\ watchdog[a]
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase \notin {"checking", "building"} \* convex/domain/proposal.ts:166
  /\ watchdog' = [watchdog EXCEPT ![a] = FALSE]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, runStatus, staleWrote, badRetry>>

\* The loaded run reports assessed or failed. advance ignores it, or the fence drops it.
LateCheckDropped(a) ==
  /\ runStatus[a] = "loadedChecking"
  /\ a # attempt \* convex/model/proposals.ts:116
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

CheckIgnored(a) ==
  /\ runStatus[a] = "loadedChecking"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase # "checking" \* convex/domain/proposal.ts:119
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

LateBuildDropped(a) ==
  /\ runStatus[a] = "loadedBuilding"
  /\ a # attempt \* convex/model/proposals.ts:116
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

BuildIgnored(a) ==
  /\ runStatus[a] = "loadedBuilding"
  /\ a = attempt \* convex/model/proposals.ts:116
  /\ phase # "building" \* convex/domain/proposal.ts:139
  /\ runStatus' = [runStatus EXCEPT ![a] = "none"]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, watchdog, staleWrote, badRetry>>

StaleWatchdogDropped(a) ==
  /\ watchdog[a]
  /\ a # attempt \* convex/model/proposals.ts:116
  /\ watchdog' = [watchdog EXCEPT ![a] = FALSE]
  /\ UNCHANGED <<phase, warnings, attempt, countdown, runStatus, staleWrote, badRetry>>

\* convex/domain/proposal.ts:132 「このまま作る」.
Confirm ==
  /\ phase = "awaitingConfirmation" \* convex/domain/proposal.ts:132
  /\ warnings' = IF warnings = "pending" THEN "acked" ELSE warnings
  /\ phase' = "building"
  /\ countdown' = "idle"
  /\ staleWrote' = staleWrote
  /\ badRetry' = badRetry
  /\ attempt < MaxAttempt
  /\ attempt' = attempt + 1 \* convex/model/proposals.ts:200
  /\ runStatus' = [runStatus EXCEPT ![attempt + 1] = "scheduled"]
  /\ watchdog' = [watchdog EXCEPT ![attempt + 1] = TRUE] \* convex/model/proposals.ts:209

\* convex/domain/proposal.ts:169 failedDuring checking.
RetryCheck ==
  /\ phase = "failedChecking"
  /\ countdown = "done" \* convex/domain/proposal.ts:168
  /\ phase' = "checking"
  /\ warnings' = "none"
  /\ countdown' = "idle"
  /\ staleWrote' = staleWrote
  /\ badRetry' = badRetry
  /\ attempt < MaxAttempt
  /\ attempt' = attempt + 1 \* convex/model/proposals.ts:200
  /\ runStatus' = [runStatus EXCEPT ![attempt + 1] = "scheduled"]
  /\ watchdog' = [watchdog EXCEPT ![attempt + 1] = TRUE] \* convex/model/proposals.ts:209

\* convex/domain/proposal.ts:171 failedDuring building, same assessment.
RetryBuild ==
  /\ phase = "failedBuilding"
  /\ countdown = "done" \* convex/domain/proposal.ts:168
  /\ phase' = "building"
  /\ warnings' = warnings
  /\ countdown' = "idle"
  /\ staleWrote' = staleWrote
  /\ badRetry' = badRetry
  /\ attempt < MaxAttempt
  /\ attempt' = attempt + 1 \* convex/model/proposals.ts:200
  /\ runStatus' = [runStatus EXCEPT ![attempt + 1] = "scheduled"]
  /\ watchdog' = [watchdog EXCEPT ![attempt + 1] = TRUE] \* convex/model/proposals.ts:209

\* convex/domain/proposal.ts:168 now < retryableAt. convex/domain/tuning.ts:30
\* The button shows the countdown and the mutation leaves the Proposal where it is.
RetryTooSoon ==
  /\ phase \in {"failedChecking", "failedBuilding"} \* convex/domain/proposal.ts:168
  /\ countdown = "running" \* convex/domain/tuning.ts:30
  /\ UNCHANGED vars

\* One step across RETRY_COOLDOWN_MS. convex/domain/tuning.ts:30
CountdownFinishes ==
  /\ countdown = "running"
  /\ countdown' = "done"
  /\ UNCHANGED <<phase, warnings, attempt, runStatus, watchdog, staleWrote, badRetry>>

Next ==
  \/ \E a \in Att : LoadRun(a)
  \/ \E a \in Att : RunFindsNothing(a)
  \/ \E a \in Att : ReportNoWarning(a)
  \/ \E a \in Att : ReportWarning(a)
  \/ \E a \in Att : ReportBuilt(a)
  \/ \E a \in Att : RunFailsCheck(a)
  \/ \E a \in Att : RunFailsBuild(a)
  \/ \E a \in Att : WatchdogFailsCheck(a)
  \/ \E a \in Att : WatchdogFailsBuild(a)
  \/ \E a \in Att : WatchdogIgnored(a)
  \/ \E a \in Att : LateCheckDropped(a)
  \/ \E a \in Att : CheckIgnored(a)
  \/ \E a \in Att : LateBuildDropped(a)
  \/ \E a \in Att : BuildIgnored(a)
  \/ \E a \in Att : StaleWatchdogDropped(a)
  \/ Confirm
  \/ RetryCheck
  \/ RetryBuild
  \/ RetryTooSoon
  \/ CountdownFinishes

Spec == Init /\ [][Next]_vars

====
