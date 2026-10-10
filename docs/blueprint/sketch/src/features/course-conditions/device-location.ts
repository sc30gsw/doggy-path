/**
 * The device's current location, best effort. The only file that calls expo-location.
 * Never throws: denied permission, services off, or timeout → null.
 */
import type { LatLng } from '@/convex/domain/courseConditions';

export const DEVICE_LOCATION_TIMEOUT_MS = 5_000;

export async function getDeviceLocation(): Promise<LatLng | null> {
  // TODO: requestForegroundPermissionsAsync(); not granted → null;
  //       race getCurrentPositionAsync({ accuracy: Balanced }) against the timeout,
  //       falling back to getLastKnownPositionAsync({ maxAge: 10 min }); map coords → LatLng.
  throw new Error('not implemented');
}
