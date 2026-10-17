---
name: maintain-verification-skill
description: Periodic pass that keeps a project's verify-<app> skill on e2e and its feature map honest. Reads every feature from source in parallel, drives every feature through its e2e test or a live MCP session, and ships at most one PR of proven corrections. Use for /maintain-verification-skill, "audit the verify skill", or when a verify skill's tests or feature map have fallen behind the app.
disable-model-invocation: true
---

# Maintain a verification skill

A feature map rots the moment the app changes. This skill is the upkeep
loop for a skill that `/create-verification-skill` generated on e2e,
`.agents/skills/verify-<app>/` with its `features/` map, or any
project-local verification skill that drives an `e2e.config.ts`. The unit
of rigor is the feature, not every sentence: cover every feature file from
source and exercise every feature live, without proving each bullet.

The e2e skill is the reference for everything e2e does. Read it first and
link to it rather than restate it. It is `.agents/skills/e2e/SKILL.md` in
the project, and `npx e2e guide <topic>` prints it from the installed
package. Topics named below (`mcp`, `writing-tests`, `running`,
`debugging`, `explore`, `bug-bash`) are its reference files. The target
skill's own sections (Launch, Doctor, Drive, Evidence, Cleanup) decide how
this app is run; this skill decides what a pass covers.

## Outcomes

Pick one, and say which.

| Outcome | Means |
| --- | --- |
| `clean` | Every feature got source and live coverage; nothing worth shipping. No branch, no PR |
| `changed` | One PR ships proven doc, test, or map corrections |
| `blocked` | Coverage could not finish or a proven fix could not ship safely. Say exactly what blocked it: the command, its exit code or error code, and the unmet prerequisite |

## Edit scope

Edit only the verification harness:

- the skill's directory, its SKILL.md and `features/`;
- the test files the map names, under the config's `tests` glob, and the
  helpers they import (such as `tests/support/`);
- `e2e.config.ts` when a harness gap needs it, re-proven by Doctor.

Never edit product code (routes, components, the backend, `app.json`)
during a pass. A behavior the map describes that the app no longer does is
either doc drift (fix the map and the test that pins it) or a product
regression (report it, never paper over it in the map). A failing test is
not changed to match broken behavior.

## Pass

0. **Locate the target.** The skill to maintain is the project-local skill
   with Launch, Doctor and Drive sections and a `features/README.md`,
   usually `.agents/skills/verify-*/`, linked from `.claude/skills/`.
   Several candidates: ask which one. None: stop and point at
   `/create-verification-skill` instead of inventing a target. Read its
   Host requirements before anything else. A host that cannot meet them (no
   simulator on a Linux container for an iOS target, no browser, no model
   for a charter) still runs steps 1 to 3; the live pass ends `blocked` and
   says which requirement failed.

1. **Index hygiene.** Read the feature map README and glob its sibling
   files. Fix missing, extra, duplicate, or dead entries. Then check the
   map against e2e itself, cheaply, without starting the app:
   - `npx e2e list` prints every test-target pair. Each test file the index
     names appears there; each test file there is named by a feature or the
     Doctor; each target a charter line names (`slug|target|agent|charter`)
     is declared in the config.
   - The status column agrees with the tests: a feature whose test file
     exists is not `untested`, and one named `none` has no file.
   - Each feature file keeps the H2s `/create-verification-skill` defines:
     `Sub-features`, `How to get to it (user POV)`, `Driving it with e2e`,
     `Proof`, `Charters`, `Gotchas`.
   Lightweight; no generated inventory.

2. **Source wave.** One read-only subagent per feature file, launched
   concurrently. Each one explains "how does this user-facing feature work?"
   from source and from its test file, and flags likely drift with file and
   line citations: a route, label, placeholder, role, or footer string the
   feature file or test names that the source no longer renders, a
   sub-feature the source added or removed, a gotcha the code no longer
   has. It returns one concise live recipe: the test file to run, the
   sub-features it does not pin, and the MCP steps for those. Children
   never drive the app, never open an e2e session, and never edit files.
   Return shape: feature summary / source entry points / likely drift or
   none / one recipe.

3. **Reconcile.** Every feature file has a returned summary. Merge
   overlapping recipes into as few app states as practical, in the order
   the app reaches them (signed out, then a fresh account, then a saved
   profile). Spot-check cited drift; do not re-prove clean claims. Sweep
   recent churn for user-facing surfaces the map lacks (`git log` on the
   route and screen directories since the map's last commit), and require a
   concrete source path before calling one missing. A missing feature gets
   a feature file in this pass only when it is also driven in step 4;
   otherwise report it for `/create-verification-skill`.

4. **Live pass.** Required even when source looks clean. The coordinator
   owns all driving, through the target skill's Launch section: the runner
   starts the app from `app.command` for `npx e2e run`, and `open_session`
   starts it for a live MCP walk. One shared device or one fixed port means
   one drive at a time: never run a shell `e2e run` while an MCP session
   holds it.
   - Doctor first: the skill's Doctor commands, usually `npx e2e list` then
     the smoke test. Both exit `0` before any feature is driven.
   - Exercise every feature at least once. Run its test file with
     `npx e2e run <file> --output .e2e/proof/maintain-<feature>`, since the
     next run clears `.e2e/results/`. Walk the sub-features its test does
     not pin over MCP (`open_session`, `observe`, `locate` each locator the
     map names, `screenshot` or `start_recording`, `close_session`). A
     signed-in feature starts from the credentials the skill names, never
     the Owner's own account.
   - Hold three invariants the whole pass, whatever fails. (1) Never drive
     an instance you have not health-checked since it last did something
     surprising: Doctor before the first drive, again after any failed
     test or a session that ended in an error code, and where Doctor cannot
     see the failure (a sheet left open, a wedged screen on a healthy app)
     relaunch with `app.open()` or reopen the session rather than hoping.
     (2) Evidence captured so far survives every cleanup: check it at its
     named location under `.e2e/proof/`, do not assume it. (3) Nothing a
     drive started outlives its usefulness: `close_session` every session,
     leave Metro or the server to the runner that started it, and clean the
     residue of a failed iteration (seeded accounts, a leftover
     `e2e.bugbash.config.ts`) whether the session is stuck, exited, or
     shared. A server the user started stays theirs; never kill by process
     name.
   - A Doctor failure caused by skill drift (a changed port, a launch
     command the config no longer runs, a landmark that moved) is drift:
     fix it under edit scope and retry once, restarting only what the fix
     invalidated, before calling the pass `blocked`. Read the error code
     against topic `debugging` before deciding which it is.
   - A feature that cannot be reached is `verified-unreachable` only with
     the concrete prerequisite (account, deployment key, OS, simulator,
     model) and the command attempted. If the map omits that prerequisite,
     that is drift.
   - Charters: when the skill's bug-bash config with a model exists, run
     one charter per feature with `--max-steps 3` and an `--output` under
     `.e2e/bugbash/`, and read `run.explore` in `report.json` to see that
     the steps followed the charter. Without a model, say the charters are
     unproven; a charter is never edited on a guess.
   - Any harness fix from triage gets re-driven live before it ships. Final
     teardown happens after the last drive of the pass, re-proofs included,
     so nothing outlives the pass and the evidence stays.

5. **Triage.**

   | Finding | Kind | Action |
   | --- | --- | --- |
   | Wrong or missing user-POV description, a label or route that changed, a stale status | Doc drift | Fix the feature file and the index |
   | Working behavior the test cannot drive: a locator that matches nothing or two nodes, a wait the app outgrew, a sign-in step that moved | Harness gap | Fix the test or its helper, `locate` the new locator first, rerun the file green. A shipped helper is executable and its invocation is in the skill body |
   | App behavior that is actually broken | Product gap | Record it for the user with the failing test and its trace page, keep it out of this PR |

   A status turns `tested` only after its test file ran green in this pass.
   A test written from source but not run stays "tested, not yet run".

6. **Ship or stop.** For `changed`: one PR of proven corrections, the
   feature file and the test that pins it in the same commit, every changed
   file re-read first, the evidence paths named in the PR body. For `clean`
   or `blocked`: no PR; report the outcome and the coverage honestly,
   including the drift found but not proven.

Keep concise run notes (features covered, unreachable prerequisites,
confirmed drift, product gaps, outcome) in a scratch location outside the
repo; never commit them. `.e2e/` is e2e's output directory: read it, write
only through `--output`, never edit it.

## Rules

- Claim nothing the app did not show you. A correction cites the source
  line or the run that proved it.
- One sentence from the e2e skill beats a paragraph of your own. Link the
  topic.
- Never put a secret in the skill, the map, or a test. Name the credential
  (topic `setup`).
- Never skip, disable, or loosen a test to get green.
