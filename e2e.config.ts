import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

const METRO_PORT = 8081;
const METRO_URL = `http://localhost:${METRO_PORT}`;

const device = process.env.DOGGY_PATH_DEVICE;

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios',
      engine: mobile({ platform: 'ios', ...(device ? { device } : {}) }),
      app: {
        bundleId: 'com.sc30gsw.doggy-path',
        // Refused without a prompt; a proposal then starts from the previous point or 東京駅.
        permissions: { location: 'deny' },
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
          executable: 'bun',
          args: ['scripts/e2e-stack.ts', String(METRO_PORT)],
          env: {
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
  launchTimeout: 180_000,
  // A relaunch shows its first screen about 5 s later, after the bundle loads and the session
  // resolves, which the 5 s default only sometimes covers.
  assertionTimeout: 15_000,
  credentials: {
    owner: {
      username: process.env.E2E_USER_OWNER_USERNAME ?? '',
      password: () => process.env.E2E_USER_OWNER_PASSWORD ?? '',
    },
  },
} satisfies E2EConfig;
