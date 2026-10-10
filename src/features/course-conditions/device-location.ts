import * as Location from 'expo-location';

import type { LatLng } from '@/convex/domain/courseConditions';

const DEVICE_LOCATION_TIMEOUT_MS = 5_000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

export async function getDeviceLocation(): Promise<LatLng | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const position = await currentOrLastKnown();
    if (!position) return null;
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

async function currentOrLastKnown(): Promise<Location.LocationObject | null> {
  const current = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    delay(DEVICE_LOCATION_TIMEOUT_MS),
  ]);
  if (current) return current;
  return Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
}

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}
