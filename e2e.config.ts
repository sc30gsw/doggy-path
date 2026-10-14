import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

const METRO_PORT = 8081;
const METRO_URL = `http://localhost:${METRO_PORT}`;

// One simulator is the whole pool. DOGGY_PATH_DEVICE names it when several are booted.
const device = process.env.DOGGY_PATH_DEVICE;

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios',
      engine: mobile({ platform: 'ios', ...(device ? { device } : {}) }),
      app: {
        // The development build from `bunx expo run:ios --no-bundler`. Expo Go is not driven.
        bundleId: 'com.sc30gsw.doggy-path',
        // Every fresh launch loads this Metro with the dev menu off.
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
          args: ['expo', 'start', '--host', 'localhost', '--port', String(METRO_PORT)],
          env: {
            // No file watching, no prompts. Each run bundles the current source.
            CI: '1',
            EXPO_NO_TELEMETRY: '1',
            // Without it Metro listens on ::1 only and the client cannot reach 127.0.0.1.
            NODE_OPTIONS: '--dns-result-order=ipv4first',
          },
          startupTimeout: 120_000,
          log: '.e2e/logs/metro.log',
        },
        readyUrl: `${METRO_URL}/status`,
      },
    },
  ],
  workers: 1,
  // The first launch bundles the whole app.
  launchTimeout: 180_000,
  credentials: {
    // A disposable account on the development Convex deployment, never the Owner's own.
    // Set E2E_USER_OWNER_USERNAME and E2E_USER_OWNER_PASSWORD before a signed-in test or charter.
    owner: {
      username: process.env.E2E_USER_OWNER_USERNAME ?? '',
      password: () => process.env.E2E_USER_OWNER_PASSWORD ?? '',
    },
  },
} satisfies E2EConfig;
