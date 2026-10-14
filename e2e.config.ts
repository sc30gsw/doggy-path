import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

import { E2E_BACKEND_DIR, PROJECT_ROOT, readE2eBackendPorts } from './scripts/e2e-backend-location';

const METRO_PORT = 8081;
const METRO_URL = `http://localhost:${METRO_PORT}`;

function requireE2eBackendPorts(): { cloud: number; site: number } {
  const ports = readE2eBackendPorts();
  if (ports === null) {
    throw new Error(
      'The local Convex deployment for e2e is not set up. Run `bun run e2e:backend`.',
    );
  }
  return ports;
}

const convexPorts = requireE2eBackendPorts();

const device = process.env.DOGGY_PATH_DEVICE;

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios',
      engine: mobile({ platform: 'ios', ...(device ? { device } : {}) }),
      app: {
        bundleId: 'com.sc30gsw.doggy-path',
        launchArguments: [
          '--initialUrl',
          METRO_URL,
          '-EXDevMenuShowsAtLaunch',
          'NO',
          '-EXDevMenuIsOnboardingFinished',
          'YES',
          '-EXDevMenuShowFloatingActionButton',
          'NO',
        ],
        command: {
          executable: 'bunx',
          cwd: E2E_BACKEND_DIR,
          args: [
            'convex',
            'dev',
            '--typecheck',
            'disable',
            '--codegen',
            'disable',
            '--tail-logs',
            'always',
            '--start',
            `cd ${JSON.stringify(PROJECT_ROOT)} && bunx expo start --host localhost --port ${METRO_PORT}`,
          ],
          env: {
            CI: '1',
            EXPO_NO_TELEMETRY: '1',
            // Without it Metro listens on ::1 only and the client cannot reach 127.0.0.1.
            NODE_OPTIONS: '--dns-result-order=ipv4first',
            CONVEX_AGENT_MODE: 'anonymous',
            // Expo never overrides a variable already set, so these win over `.env.local`.
            EXPO_PUBLIC_CONVEX_URL: `http://127.0.0.1:${convexPorts.cloud}`,
            EXPO_PUBLIC_CONVEX_SITE_URL: `http://127.0.0.1:${convexPorts.site}`,
          },
          startupTimeout: 120_000,
          log: '.e2e/logs/metro.log',
        },
        readyUrl: `${METRO_URL}/status`,
      },
    },
  ],
  workers: 1,
  launchTimeout: 180_000,
  credentials: {
    owner: {
      username: process.env.E2E_USER_OWNER_USERNAME ?? '',
      password: () => process.env.E2E_USER_OWNER_PASSWORD ?? '',
    },
  },
} satisfies E2EConfig;
