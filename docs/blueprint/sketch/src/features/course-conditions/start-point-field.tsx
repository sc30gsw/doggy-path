/**
 * Start Point input: a 「現在地」 button and a small map where a long-press drops a pin.
 * No address search (spec). Empty is valid: the fallback chain runs at request time.
 */
import type { LatLng } from '@/convex/domain/courseConditions';

export function StartPointField(props: {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
}): React.ReactElement {
  void props;
  // TODO: 「現在地」 → getDeviceLocation() → onChange(point) (toast when null);
  //       MapView (initialRegion = value ?? DEFAULT_POINT) onLongPress → onChange(coordinate);
  //       Marker at value; 「クリア」 → onChange(null). Hint text when empty:
  //       `未指定のときは現在地 → 前回の開始地点 → ${DEFAULT_POINT_NAME} の順に使います`.
  throw new Error('not implemented');
}
