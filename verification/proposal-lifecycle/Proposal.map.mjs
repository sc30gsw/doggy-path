// Chart labels for the Proposal lifecycle. The reader is the Owner looking at Home.
export const readerActions = ['Confirm', 'RetryCheck', 'RetryBuild', 'RetryTooSoon'];

const COUNTDOWN_SUFFIX = { running: ', countdown running', done: ', you can retry' };

const WHILE_COUNTING = {
  'running|checking': 'Checking the conditions, countdown still running',
  'running|building': 'Building the course, countdown still running',
};

const WHEN_STALE = {
  ready: 'Showing courses from an older attempt',
  failedChecking: 'Failed by an older attempt',
  failedBuilding: 'Failed by an older attempt',
  awaitingConfirmation: 'Asking you to confirm a warning from an older attempt',
  building: 'Building from an older attempt',
  checking: 'Checking because an older attempt reported',
};

const WHEN_BAD_RETRY = {
  checking: 'Checking the conditions after a failed build',
  building: 'Building the course after a failed check',
};

const WHEN_PENDING = {
  building: 'Building the course, warning still open',
  ready: 'Showing courses, warning still open',
  failedChecking: 'Failed, warning still open',
  failedBuilding: 'Failed, warning still open',
};

const PHASE = {
  checking: 'Checking the conditions',
  awaitingConfirmation: 'Asking you to confirm a warning',
  building: 'Building the course',
  ready: 'Showing courses',
};

const FAILED = { failedChecking: 'Check failed', failedBuilding: 'Build failed' };

export function state(v) {
  const counting = WHILE_COUNTING[`${v.countdown}|${v.phase}`];
  if (counting) return counting;
  if (v.staleWrote && WHEN_STALE[v.phase]) return WHEN_STALE[v.phase];
  if (v.badRetry && WHEN_BAD_RETRY[v.phase]) return WHEN_BAD_RETRY[v.phase];
  if (v.warnings === 'pending' && WHEN_PENDING[v.phase]) return WHEN_PENDING[v.phase];
  const failed = FAILED[v.phase];
  if (failed) return `${failed}${COUNTDOWN_SUFFIX[v.countdown] ?? ''}`;
  return PHASE[v.phase] ?? 'Home';
}

export function group(v) {
  if (v.phase === 'ready') return 'Courses shown';
  if (v.phase === 'awaitingConfirmation') return 'Waiting for you';
  if (v.phase === 'failedChecking' || v.phase === 'failedBuilding') return 'Failed';
  return 'Working';
}

export const groupColors = {
  'Courses shown': '#d1f2eb',
  'Waiting for you': '#fdebd0',
  Failed: '#f5b7b1',
  Working: '#d6eaf8',
};

const STEPS = {
  LoadRun: 'the run reads the proposal',
  RunFindsNothing: 'the run finds the proposal has moved on',
  ReportNoWarning: 'the condition check finds no warning',
  ReportWarning: 'the condition check finds a warning',
  ReportBuilt: 'the course build finishes',
  RunFailsCheck: 'the condition check fails',
  RunFailsBuild: 'the course build fails',
  WatchdogFailsCheck: 'the check times out',
  WatchdogFailsBuild: 'the build times out',
  WatchdogIgnored: 'a timeout arrives after Home has moved on',
  LateCheckDropped: 'a report from an older attempt arrives',
  CheckIgnored: 'a late condition-check report is ignored',
  LateBuildDropped: 'a report from an older attempt arrives',
  BuildIgnored: 'a late build report is ignored',
  StaleWatchdogDropped: 'a timeout from an older attempt arrives',
  Confirm: 'you tap このまま作る',
  RetryCheck: 'you tap もう一度試す',
  RetryBuild: 'you tap もう一度試す',
  RetryTooSoon: 'a retry arrives during the countdown',
  CountdownFinishes: 'the retry countdown finishes',
};

export function step(action) {
  return STEPS[action] ?? '';
}

export function timer(action) {
  if (action === 'CountdownFinishes') return 60;
}

export function cause(v, _facts, invariant) {
  if (invariant === 'StaleIgnored' && v.phase === 'ready') {
    return "an older attempt's courses replaced the current build";
  }
  if (
    invariant === 'StaleIgnored' &&
    (v.phase === 'failedChecking' || v.phase === 'failedBuilding')
  ) {
    return "an older attempt's timeout failed the proposal";
  }
  if (invariant === 'StaleIgnored' && v.phase === 'awaitingConfirmation') {
    return "an older attempt's warning replaced the current check";
  }
  if (invariant === 'StaleIgnored') return 'an older attempt changed Home';
  if (invariant === 'WarningGate') return 'a warning never stopped the proposal';
  if (invariant === 'RetryResumes' && v.phase === 'checking') {
    return 'retry after a failed build started the check over';
  }
  if (invariant === 'RetryResumes') return 'retry skipped the failed phase';
  if (invariant === 'Countdown') return 'retry ran during the countdown';
  return null;
}
