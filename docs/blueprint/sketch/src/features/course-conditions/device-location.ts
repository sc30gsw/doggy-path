import type { LatLng } from '@/convex/domain/courseConditions';

export const DEVICE_LOCATION_TIMEOUT_MS = 5_000;

export async function getDeviceLocation(): Promise<LatLng | null> {
  throw new Error('not implemented');
}
