import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';

export default {
  // Replace Settings with your app's bundle id.
  targets: [{ name: 'ios', engine: mobile({ platform: 'ios' }), app: { bundleId: 'Settings' } }],
  workers: 1,
} satisfies E2EConfig;
