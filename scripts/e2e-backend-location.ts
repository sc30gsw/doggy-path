/// <reference types="node" />

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vb from 'valibot';

export const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// The Convex CLI writes the deployment it runs against into `.env.local` of its working
// directory, whatever `--env-file` says. Running it from here keeps the project's own
// `.env.local` on the cloud dev deployment.
export const E2E_BACKEND_DIR = join(
  homedir(),
  '.cache',
  'doggy-path-e2e',
  createHash('sha256').update(PROJECT_ROOT).digest('hex').slice(0, 12),
);

const LOCAL_DEPLOYMENT_CONFIG = join(E2E_BACKEND_DIR, '.convex', 'local', 'default', 'config.json');

export function readE2eBackendPorts(): { cloud: number; site: number } | null {
  if (!existsSync(LOCAL_DEPLOYMENT_CONFIG)) return null;
  return vb.parse(
    vb.object({ ports: vb.object({ cloud: vb.number(), site: vb.number() }) }),
    JSON.parse(readFileSync(LOCAL_DEPLOYMENT_CONFIG, 'utf8')),
  ).ports;
}
