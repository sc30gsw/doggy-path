/// <reference types="node" />

import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

import { CONVEX_BIN, prepareE2eBackend } from './e2e-backend';
import { E2E_BACKEND_DIR, PROJECT_ROOT, convexCliEnv } from './e2e-backend-location';

// `convex dev --start` leaves the started command running when it is terminated, so the e2e
// runner's stop never reached Metro. This process owns both and stops both.
const metroPort = process.argv[2] ?? '8081';

const backend = prepareE2eBackend();

const children: ChildProcess[] = [
  spawn(
    CONVEX_BIN,
    ['dev', '--typecheck', 'disable', '--codegen', 'disable', '--tail-logs', 'always'],
    {
      cwd: E2E_BACKEND_DIR,
      env: convexCliEnv(backend.deployment),
      stdio: 'inherit',
    },
  ),
  spawn(
    join(PROJECT_ROOT, 'node_modules', '.bin', 'expo'),
    ['start', '--host', 'localhost', '--port', metroPort],
    {
      cwd: PROJECT_ROOT,
      // Expo never overrides a variable already set, so these win over the project's `.env.local`.
      env: {
        ...process.env,
        EXPO_PUBLIC_CONVEX_URL: backend.cloudUrl,
        EXPO_PUBLIC_CONVEX_SITE_URL: backend.siteUrl,
      },
      stdio: 'inherit',
    },
  ),
];
console.log(`Metro serves the app against ${backend.deployment} at ${backend.cloudUrl}`);

let stopping = false;
function stopAll(exitCode: number): void {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  // Signalling a child that already exited is a no-op.
  for (const child of children) child.kill('SIGTERM');
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => stopAll(0));
for (const child of children) child.on('exit', (code) => stopAll(code ?? 1));
