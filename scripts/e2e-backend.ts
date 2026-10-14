/// <reference types="node" />

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  E2E_BACKEND_DIR,
  PROJECT_ROOT,
  convexCliEnv,
  readE2eBackend,
  type E2eBackend,
} from './e2e-backend-location';

// esbuild bundles a symlinked `convex/` from its real path and the push fails with
// `found wrong number of app bundles`, so `convex/` is copied and the rest linked.
const LINKED = ['package.json', 'node_modules'];
const INVALID_PROVIDER_KEY = 'e2e-invalid-key';
const FIXED_ENV: Record<string, string> = {
  SITE_URL: 'http://localhost:8081',
  ORS_API_KEY: INVALID_PROVIDER_KEY,
  TYPESAFE_API_KEY: INVALID_PROVIDER_KEY,
};
const PUSH = ['dev', '--once', '--typecheck', 'disable', '--codegen', 'disable'];
export const CONVEX_BIN = join(PROJECT_ROOT, 'node_modules', '.bin', 'convex');

function convex(
  deployment: string | undefined,
  args: string[],
  options: { allowFailure?: boolean } = {},
): string {
  const result = spawnSync(CONVEX_BIN, args, {
    cwd: E2E_BACKEND_DIR,
    env: convexCliEnv(deployment),
    encoding: 'utf8',
  });
  // `convex dev --once` can print `✖` and still exit 0.
  const failed = result.status !== 0 || result.stderr.includes('✖');
  if (failed && !options.allowFailure) {
    throw new Error(`convex ${args.slice(0, 2).join(' ')} failed:\n${result.stderr}`);
  }
  return result.stdout;
}

function currentLink(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

function linkProject(): void {
  mkdirSync(E2E_BACKEND_DIR, { recursive: true });
  for (const name of LINKED) {
    const link = join(E2E_BACKEND_DIR, name);
    const target = join(PROJECT_ROOT, name);
    if (currentLink(link) === target) continue;
    rmSync(link, { force: true });
    symlinkSync(target, link);
  }
}

function copyConvexFunctions(): void {
  const copy = join(E2E_BACKEND_DIR, 'convex');
  if (currentLink(copy) !== null) unlinkSync(copy);
  else rmSync(copy, { recursive: true, force: true });
  cpSync(join(PROJECT_ROOT, 'convex'), copy, { recursive: true });
}

function authKeys(): Record<string, string> {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  return {
    JWT_PRIVATE_KEY: pem.trimEnd().replace(/\n/g, ' '),
    JWKS: JSON.stringify({ keys: [{ use: 'sig', ...publicKey.export({ format: 'jwk' }) }] }),
  };
}

function createDeploymentWithFailingFirstPush(): void {
  convex(undefined, PUSH, { allowFailure: true });
}

function ensureLocalDeployment(): E2eBackend {
  const existing = readE2eBackend();
  if (existing) return existing;
  createDeploymentWithFailingFirstPush();
  const created = readE2eBackend();
  if (!created) throw new Error(`No local deployment was created in ${E2E_BACKEND_DIR}.`);
  return created;
}

export function prepareE2eBackend(): E2eBackend {
  linkProject();
  copyConvexFunctions();
  const backend = ensureLocalDeployment();
  writeFileSync(join(E2E_BACKEND_DIR, '.env.local'), `CONVEX_DEPLOYMENT=${backend.deployment}\n`);

  const present = new Set(
    convex(backend.deployment, ['env', 'list'])
      .split('\n')
      .map((line) => line.split('=')[0]),
  );
  const missing: Record<string, string> = {
    ...(present.has('JWT_PRIVATE_KEY') && present.has('JWKS') ? {} : authKeys()),
    ...Object.fromEntries(Object.entries(FIXED_ENV).filter(([name]) => !present.has(name))),
  };
  for (const [name, value] of Object.entries(missing)) {
    // `--` keeps a value that starts with `-----BEGIN` from parsing as a flag.
    convex(backend.deployment, ['env', 'set', '--', name, value]);
    console.log(`set ${name}`);
  }

  convex(backend.deployment, PUSH);
  console.log(`pushed functions to ${backend.deployment} at ${backend.cloudUrl}`);
  return backend;
}

if (import.meta.main) prepareE2eBackend();
