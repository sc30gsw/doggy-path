import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { MutationCtx } from '../../convex/_generated/server';
import { retryableAt, type Assessment, type ProposalState } from '../../convex/domain/proposal';
import {
  applyOwnerEventToLatest,
  loadRunInput,
  recordRunEvent,
  requestProposal,
} from '../../convex/model/proposals';

const here = dirname(fileURLToPath(import.meta.url));
const cfgText = readFileSync(join(here, 'Proposal.cfg'), 'utf8');
const maxAttempt = Number(/MaxAttempt\s*=\s*(\d+)/.exec(cfgText)?.[1]);
if (!Number.isInteger(maxAttempt) || maxAttempt < 1) {
  throw new Error('Proposal.cfg does not set MaxAttempt');
}

const TLC_VERSION = '1.7.4';
const TLC_SHA256 = '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88';
const TLC_URL = `https://github.com/tlaplus/tlaplus/releases/download/v${TLC_VERSION}/tla2tools.jar`;

const userId = 'user_1' as Id<'users'>;
const ownerId = 'owner_1' as Id<'owners'>;

type ProposalDoc = Doc<'proposals'>;
type Job =
  | { kind: 'run'; attempt: number }
  | { kind: 'watchdog'; attempt: number; reason: 'timedOut' };
type Flight = { attempt: number; origin: 'checking' | 'building' };
type World = {
  proposal: ProposalDoc;
  scheduled: Job[];
  inflight: Flight[];
  now: number;
  openWarning: boolean;
  path: string[];
};

type Live = {
  proposal: ProposalDoc;
  scheduled: Job[];
  inflight: Flight[];
  now: number;
  openWarning: boolean;
};

type Failure = { rule: string; detail: string };

const course = {
  key: 'loop',
  path: [{ latitude: 35.681236, longitude: 139.767125 }],
  distanceM: 1200,
  ascentM: 0,
  unpavedShare: 0,
  surroundings: { kind: 'unknown' as const },
};

function assessment(warnings: Assessment['warnings']): Assessment {
  return {
    pace: 'normal',
    length: { basis: 'judged', lengthClass: 'short' },
    warnings,
    judgedBy: 'fallback',
  };
}

function clockOf(live: Live): number {
  return live.now;
}

function installClock(live: Live): void {
  Date.now = () => clockOf(live);
}

function makeCtx(live: Live): MutationCtx {
  const owners = new Map<string, Doc<'owners'>>([
    [
      ownerId,
      {
        _id: ownerId,
        _creationTime: 0,
        userId,
        ownerName: 'A',
        dog: {
          dogName: 'Pochi',
          breed: { kind: 'mixed' },
          birthMonth: { year: 2020, month: 1, estimated: false },
          sex: 'male',
        },
      },
    ],
  ]);
  const db = {
    get: async (table: string, id: string) => {
      if (table === 'proposals' && id === live.proposal._id) return live.proposal;
      return null;
    },
    insert: async (table: string, value: Record<string, unknown>) => {
      if (table !== 'proposals') throw new Error(`unexpected insert ${table}`);
      const id = 'proposals_1' as Id<'proposals'>;
      live.proposal = {
        ...(value as Omit<ProposalDoc, '_id' | '_creationTime'>),
        _id: id,
        _creationTime: live.now,
      };
      return id;
    },
    patch: async (table: string, id: string, fields: Partial<ProposalDoc>) => {
      if (table !== 'proposals' || id !== live.proposal._id) throw new Error('unexpected patch');
      live.proposal = { ...live.proposal, ...fields };
    },
    delete: async () => {
      throw new Error('unexpected delete');
    },
    query: (table: string) => {
      const rows = (): Array<ProposalDoc | Doc<'owners'>> => {
        if (table === 'proposals') return [live.proposal].filter((row) => row !== undefined);
        if (table === 'owners') return [...owners.values()];
        return [];
      };
      const filter = (predicates: Array<(row: ProposalDoc | Doc<'owners'>) => boolean>) =>
        rows().filter((row) => predicates.every((predicate) => predicate(row)));
      return {
        withIndex: (
          _index: string,
          build: (q: {
            eq: (field: string, value: unknown) => unknown;
            gt: (field: string, value: unknown) => unknown;
          }) => unknown,
        ) => {
          const predicates: Array<(row: ProposalDoc | Doc<'owners'>) => boolean> = [];
          const q = {
            eq: (field: string, value: unknown) => {
              predicates.push((row) => (row as unknown as Record<string, unknown>)[field] === value);
              return q;
            },
            gt: (field: string, value: unknown) => {
              predicates.push(
                (row) =>
                  Number((row as unknown as Record<string, unknown>)[field]) > Number(value),
              );
              return q;
            },
          };
          build(q);
          const matched = () => filter(predicates);
          const ordered = (direction: 'asc' | 'desc') =>
            matched().sort((left, right) =>
              direction === 'desc'
                ? right._creationTime - left._creationTime
                : left._creationTime - right._creationTime,
            );
          return {
            order: (direction: 'asc' | 'desc') => ({
              first: async () => ordered(direction)[0] ?? null,
              take: async (count: number) => ordered(direction).slice(0, count),
            }),
            unique: async () => {
              const all = matched();
              if (all.length > 1) throw new Error('unique matched more than one row');
              return all[0] ?? null;
            },
            take: async (count: number) => matched().slice(0, count),
          };
        },
      };
    },
  };
  const scheduler = {
    runAfter: async (_delay: number, _reference: unknown, args: { attempt: number; event?: { reason: string } }) => {
      if (args.event) {
        if (args.event.reason !== 'timedOut') throw new Error(`unexpected watchdog reason ${args.event.reason}`);
        live.scheduled.push({ kind: 'watchdog', attempt: args.attempt, reason: 'timedOut' });
      } else {
        live.scheduled.push({ kind: 'run', attempt: args.attempt });
      }
      return 'job' as Id<'_scheduled_functions'>;
    },
  };
  return { db, scheduler } as unknown as MutationCtx;
}

function phaseLabel(state: ProposalState): string {
  switch (state.phase) {
    case 'checking':
      return 'Checking the conditions';
    case 'awaitingConfirmation':
      return 'Asking you to confirm a warning';
    case 'building':
      return 'Building the course';
    case 'ready':
      return 'Showing courses';
    case 'failed':
      return state.failedDuring === 'checking' ? 'Check failed' : 'Build failed';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function sameDoc(left: ProposalDoc, right: ProposalDoc): boolean {
  return JSON.stringify(left.state) === JSON.stringify(right.state) && left.attempt === right.attempt;
}

function keptAssessment(state: ProposalState): Assessment | null {
  switch (state.phase) {
    case 'awaitingConfirmation':
    case 'building':
    case 'ready':
      return state.assessment;
    case 'failed':
      return state.failedDuring === 'building' ? state.assessment : null;
    case 'checking':
      return null;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function checkWorld(live: Live): Failure | null {
  const { state } = live.proposal;
  if (state.phase === 'checking' || state.phase === 'building') {
    const run = live.scheduled.some((job) => job.kind === 'run' && job.attempt === live.proposal.attempt)
      || live.inflight.some((flight) => flight.attempt === live.proposal.attempt);
    if (!run) {
      return {
        rule: 'RunOpen',
        detail: `${phaseLabel(state)} has no run left for attempt ${live.proposal.attempt}.`,
      };
    }
    const watchdog = live.scheduled.some(
      (job) => job.kind === 'watchdog' && job.attempt === live.proposal.attempt,
    );
    if (!watchdog) {
      return {
        rule: 'WatchdogArmed',
        detail: `${phaseLabel(state)} has no timeout left for attempt ${live.proposal.attempt}.`,
      };
    }
  }
  if (live.openWarning && (state.phase === 'building' || state.phase === 'ready')) {
    return {
      rule: 'WarningGate',
      detail: `${phaseLabel(state)} while a Condition Check warning is still unconfirmed.`,
    };
  }
  if (
    live.openWarning &&
    state.phase === 'failed' &&
    state.failedDuring === 'building'
  ) {
    return {
      rule: 'WarningGate',
      detail: 'Build failed while a Condition Check warning is still unconfirmed.',
    };
  }
  return null;
}

function noteWarning(before: Live, after: Live): Failure | null {
  const prev = before.proposal.state;
  const next = after.proposal.state;
  if (next.phase === 'checking') after.openWarning = false;
  if (next.phase === 'awaitingConfirmation' && next.assessment.warnings.length > 0) {
    after.openWarning = true;
  }
  if (prev.phase === 'awaitingConfirmation' && next.phase === 'building') after.openWarning = false;
  const carried = keptAssessment(next);
  if (prev.phase === 'checking' && carried && carried.warnings.length > 0 && next.phase !== 'awaitingConfirmation') {
    after.openWarning = true;
  }
  return checkWorld(after);
}

function checkRetry(before: Live, after: Live): Failure | null {
  const prev = before.proposal.state;
  if (prev.phase !== 'failed') {
    if (!sameDoc(before.proposal, after.proposal)) {
      return { rule: 'RetryResumes', detail: 'Retry changed Home when the proposal had not failed.' };
    }
    return null;
  }
  if (before.now < retryableAt(prev)) {
    if (!sameDoc(before.proposal, after.proposal)) {
      return {
        rule: 'Countdown',
        detail: 'Retry during the countdown left the failure screen.',
      };
    }
    return null;
  }
  if (prev.failedDuring === 'checking') {
    if (after.proposal.state.phase !== 'checking' || after.proposal.attempt !== before.proposal.attempt + 1) {
      return {
        rule: 'RetryResumes',
        detail: 'Retry after a failed check did not return Home to the condition check.',
      };
    }
    return null;
  }
  const nextAssessment = keptAssessment(after.proposal.state);
  if (
    after.proposal.state.phase !== 'building' ||
    after.proposal.attempt !== before.proposal.attempt + 1 ||
    JSON.stringify(nextAssessment) !== JSON.stringify(prev.assessment)
  ) {
    return {
      rule: 'RetryResumes',
      detail: 'Retry after a failed build did not continue that build with the same assessment.',
    };
  }
  return null;
}

function checkStale(before: Live, after: Live, eventAttempt: number): Failure | null {
  if (eventAttempt === before.proposal.attempt) return null;
  if (sameDoc(before.proposal, after.proposal)) return null;
  return {
    rule: 'StaleIgnored',
    detail: `A report from attempt ${eventAttempt} changed Home while the proposal was on attempt ${before.proposal.attempt}. Home went from ${phaseLabel(before.proposal.state)} to ${phaseLabel(after.proposal.state)}.`,
  };
}

function snapshot(live: Live, path: string[]): World {
  return {
    proposal: structuredClone(live.proposal),
    scheduled: structuredClone(live.scheduled),
    inflight: structuredClone(live.inflight),
    now: live.now,
    openWarning: live.openWarning,
    path,
  };
}

function revive(world: World): Live {
  return {
    proposal: structuredClone(world.proposal),
    scheduled: structuredClone(world.scheduled),
    inflight: structuredClone(world.inflight),
    now: world.now,
    openWarning: world.openWarning,
  };
}

function worldKey(world: World): string {
  const state = world.proposal.state;
  const countdown =
    state.phase === 'failed' ? world.now < retryableAt(state) : false;
  return JSON.stringify({
    state,
    attempt: world.proposal.attempt,
    countdown,
    openWarning: world.openWarning,
    scheduled: world.scheduled.map((job) => `${job.kind}:${job.attempt}`).sort(),
    inflight: world.inflight.map((flight) => `${flight.attempt}:${flight.origin}`).sort(),
  });
}

function printFailure(rule: string, detail: string, path: string[], live: Live): never {
  const lines = [
    `${rule} failed.`,
    detail,
    ...path.map((step, index) => `${index + 1}. ${step}`),
    `Home is now ${phaseLabel(live.proposal.state)}, attempt ${live.proposal.attempt}.`,
  ];
  console.error(lines.join('\n'));
  process.exit(1);
}

async function begin(): Promise<World> {
  const live: Live = {
    proposal: undefined as unknown as ProposalDoc,
    scheduled: [],
    inflight: [],
    now: 1_700_000_000_000,
    openWarning: false,
  };
  installClock(live);
  const result = await requestProposal(makeCtx(live), {
    userId,
    conditions: {},
    deviceLocation: undefined,
  });
  if (result.kind !== 'started') throw new Error('the first proposal did not start');
  const failure = checkWorld(live);
  if (failure) printFailure(failure.rule, failure.detail, ['you ask for a proposal'], live);
  return snapshot(live, ['you ask for a proposal']);
}

type Action = {
  label: string;
  run: (live: Live) => Promise<Failure | null>;
};

function actionsFor(world: World): Action[] {
  const actions: Action[] = [];
  world.scheduled.forEach((job, index) => {
    if (job.kind === 'run') actions.push(loadRun(index));
    else actions.push(fireWatchdog(index));
  });
  world.inflight.forEach((flight, index) => {
    if (flight.origin === 'checking') {
      actions.push(reportAssessed(index, true));
      actions.push(reportAssessed(index, false));
      actions.push(reportRunFailed(index));
    } else {
      actions.push(reportBuilt(index));
      actions.push(reportRunFailed(index));
    }
  });
  actions.push(confirm());
  actions.push(retry());
  if (world.proposal.state.phase === 'failed' && world.now < retryableAt(world.proposal.state)) {
    actions.push(countdownFinishes());
  }
  return actions;
}

function loadRun(index: number): Action {
  return {
    label: 'the run reads the proposal',
    run: async (live) => {
      const job = live.scheduled[index];
      if (!job || job.kind !== 'run') return { rule: 'model', detail: 'missing run' };
      live.scheduled.splice(index, 1);
      const input = await loadRunInput(makeCtx(live), {
        proposalId: live.proposal._id,
        attempt: job.attempt,
      });
      if (input === null) return checkStale(live, live, job.attempt) ?? checkWorld(live);
      const before = structuredClone(live.proposal);
      live.inflight.push({ attempt: job.attempt, origin: input.phase });
      if (job.attempt !== before.attempt && !sameDoc(before, live.proposal)) {
        return checkStale(live, live, job.attempt);
      }
      return checkWorld(live);
    },
  };
}

function fireWatchdog(index: number): Action {
  return {
    label: 'a timeout arrives',
    run: async (live) => {
      const job = live.scheduled[index];
      if (!job || job.kind !== 'watchdog') return { rule: 'model', detail: 'missing watchdog' };
      const before = structuredClone(live);
      live.scheduled.splice(index, 1);
      await recordRunEvent(makeCtx(live), {
        proposalId: live.proposal._id,
        attempt: job.attempt,
        event: { type: 'failed', reason: 'timedOut' },
      });
      return (
        checkStale(before, live, job.attempt) ??
        noteWarning(before, live) ??
        checkWorld(live)
      );
    },
  };
}

function reportAssessed(index: number, warning: boolean): Action {
  return {
    label: warning
      ? 'the condition check finds a warning'
      : 'the condition check finds no warning',
    run: async (live) => {
      const flight = live.inflight[index];
      if (!flight) return { rule: 'model', detail: 'missing run report' };
      const before = structuredClone(live);
      live.inflight.splice(index, 1);
      await recordRunEvent(makeCtx(live), {
        proposalId: live.proposal._id,
        attempt: flight.attempt,
        event: {
          type: 'assessed',
          assessment: assessment(warning ? ['tooMuchLoad'] : []),
        },
      });
      return checkStale(before, live, flight.attempt) ?? noteWarning(before, live);
    },
  };
}

function reportBuilt(index: number): Action {
  return {
    label: 'the course build finishes',
    run: async (live) => {
      const flight = live.inflight[index];
      if (!flight) return { rule: 'model', detail: 'missing build report' };
      const before = structuredClone(live);
      live.inflight.splice(index, 1);
      await recordRunEvent(makeCtx(live), {
        proposalId: live.proposal._id,
        attempt: flight.attempt,
        event: { type: 'built', scoring: { kind: 'byLength', courses: [course] } },
      });
      return checkStale(before, live, flight.attempt) ?? noteWarning(before, live);
    },
  };
}

function reportRunFailed(index: number): Action {
  return {
    label: 'the run fails',
    run: async (live) => {
      const flight = live.inflight[index];
      if (!flight) return { rule: 'model', detail: 'missing failure report' };
      const before = structuredClone(live);
      live.inflight.splice(index, 1);
      await recordRunEvent(makeCtx(live), {
        proposalId: live.proposal._id,
        attempt: flight.attempt,
        event: { type: 'failed', reason: 'internal' },
      });
      return checkStale(before, live, flight.attempt) ?? noteWarning(before, live);
    },
  };
}

function confirm(): Action {
  return {
    label: 'you tap このまま作る',
    run: async (live) => {
      const before = structuredClone(live);
      await applyOwnerEventToLatest(makeCtx(live), {
        userId,
        proposalId: live.proposal._id,
        event: { type: 'confirmed' },
      });
      if (before.proposal.state.phase !== 'awaitingConfirmation' && !sameDoc(before.proposal, live.proposal)) {
        return {
          rule: 'WarningGate',
          detail: 'このまま作る changed Home when it was not asking for confirmation.',
        };
      }
      return noteWarning(before, live);
    },
  };
}

function retry(): Action {
  return {
    label: 'you tap もう一度試す',
    run: async (live) => {
      const before = structuredClone(live);
      await applyOwnerEventToLatest(makeCtx(live), {
        userId,
        proposalId: live.proposal._id,
        event: { type: 'retryRequested' },
      });
      return checkRetry(before, live) ?? noteWarning(before, live);
    },
  };
}

function countdownFinishes(): Action {
  return {
    label: 'the retry countdown finishes',
    run: async (live) => {
      const state = live.proposal.state;
      if (state.phase !== 'failed') return { rule: 'model', detail: 'countdown without a failure' };
      live.now = retryableAt(state);
      return checkWorld(live);
    },
  };
}

type Step =
  | { kind: 'failure'; failure: Failure; live: Live; label: string }
  | { kind: 'next'; world: World | null };

async function follow(world: World, action: Action): Promise<Step> {
  const live = revive(world);
  const failure = await action.run(live).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return { rule: 'threw', detail: message };
  });
  if (failure) return { kind: 'failure', failure, live, label: action.label };
  if (live.proposal.attempt > maxAttempt) return { kind: 'next', world: null };
  return { kind: 'next', world: snapshot(live, [...world.path, action.label]) };
}

async function enqueue(world: World, seen: Set<string>, queue: World[]): Promise<void> {
  if (world.proposal.attempt > maxAttempt) return;
  const actions = actionsFor(world);
  const previousNow = Date.now;
  Date.now = () => world.now;
  const steps = await Promise.all(actions.map((action) => follow(world, action)));
  Date.now = previousNow;
  for (const step of steps) {
    if (step.kind === 'failure') {
      printFailure(step.failure.rule, step.failure.detail, [...world.path, step.label], step.live);
    }
    if (!step.world) continue;
    const key = worldKey(step.world);
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(step.world);
  }
}

async function explore(start: World): Promise<number> {
  const seen = new Set<string>([worldKey(start)]);
  const queue = [start];
  let visited = 0;
  while (queue.length > 0) {
    const world = queue.shift();
    if (!world) break;
    visited += 1;
    await enqueue(world, seen, queue);
  }
  return visited;
}

async function tlaJar(): Promise<string> {
  if (process.env.TLA2TOOLS) {
    if (!existsSync(process.env.TLA2TOOLS)) throw new Error(`TLA2TOOLS is missing: ${process.env.TLA2TOOLS}`);
    return process.env.TLA2TOOLS;
  }
  const cache = join(process.env.XDG_CACHE_HOME ?? join(process.env.HOME ?? tmpdir(), '.cache'), 'doggy-path');
  const jar = join(cache, `tla2tools-${TLC_VERSION}.jar`);
  if (!existsSync(jar) || createHash('sha256').update(readFileSync(jar)).digest('hex') !== TLC_SHA256) {
    mkdirSync(cache, { recursive: true });
    const response = await fetch(TLC_URL);
    if (!response.ok) throw new Error(`could not download TLC ${TLC_VERSION}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== TLC_SHA256) throw new Error(`TLC ${TLC_VERSION} checksum mismatch`);
    writeFileSync(jar, bytes);
  }
  return jar;
}

function runTlc(): void {
  const jar = process.env.TLA2TOOLS_RESOLVED;
  if (!jar) throw new Error('TLC jar was not resolved');
  const java = process.env.JAVA ?? 'java';
  const dir = mkdtempSync(join(tmpdir(), 'proposal-tlc-'));
  copyFileSync(join(here, 'Proposal.tla'), join(dir, 'Proposal.tla'));
  copyFileSync(join(here, 'Proposal.cfg'), join(dir, 'Proposal.cfg'));
  const result = spawnSync(
    java,
    [
      '-XX:+UseParallelGC',
      '-cp',
      jar,
      'tlc2.TLC',
      '-workers',
      '1',
      '-config',
      'Proposal.cfg',
      'Proposal.tla',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0 || !output.includes('Model checking completed. No error has been found.')) {
    console.error(output);
    process.exit(result.status === 0 ? 1 : (result.status ?? 1));
  }
  const states = /(\d+) distinct states found/.exec(output)?.[1] ?? '?';
  const depth = /depth of the complete state graph search is (\d+)/.exec(output)?.[1] ?? '?';
  console.log(`TLC ${TLC_VERSION}: ${states} distinct states, depth ${depth}, invariants hold.`);
}

async function main(): Promise<void> {
  const started = performance.now();
  const initial = await begin();
  const visited = await explore(initial);
  console.log(
    `Code: ${visited} reachable proposals up to attempt ${maxAttempt}, properties hold (${Math.round(performance.now() - started)} ms).`,
  );
  process.env.TLA2TOOLS_RESOLVED = await tlaJar();
  runTlc();
}

await main();
