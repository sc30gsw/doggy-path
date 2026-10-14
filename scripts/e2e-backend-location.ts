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

const LocalDeploymentConfig = vb.object({
  deploymentName: vb.string(),
  ports: vb.object({ cloud: vb.number(), site: vb.number() }),
});

export type E2eBackend = { deployment: string; cloudUrl: string; siteUrl: string };

export function readE2eBackend(): E2eBackend | null {
  if (!existsSync(LOCAL_DEPLOYMENT_CONFIG)) return null;
  const config = vb.parse(
    LocalDeploymentConfig,
    JSON.parse(readFileSync(LOCAL_DEPLOYMENT_CONFIG, 'utf8')),
  );
  return {
    deployment: `anonymous:${config.deploymentName}`,
    cloudUrl: `http://127.0.0.1:${config.ports.cloud}`,
    siteUrl: `http://127.0.0.1:${config.ports.site}`,
  };
}

// Bun loads the project's `.env.local` into `process.env`, so the cloud deployment arrives in
// every child unless it is replaced. `deployment` undefined lets anonymous mode create one.
export function convexCliEnv(deployment: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith('CONVEX_')) delete env[name];
  }
  return { ...env, CONVEX_AGENT_MODE: 'anonymous', CONVEX_DEPLOYMENT: deployment };
}
