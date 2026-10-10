/**
 * The map: Apple Maps on iOS, Google Maps on Android (API key via the react-native-maps
 * config plugin in app.json — Feature 4). The only file that imports react-native-maps
 * for display.
 */
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import type { LatLng } from '@/convex/domain/courseConditions';
import type { ShownCourse } from '@/convex/domain/proposalView';

const PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

/** All shown loops are drawn; the selected one on top and emphasised. */
export function CourseMap(props: {
  startPoint: LatLng;
  courses: ShownCourse[];
  selectedKey: string;
  onSelect: (key: string) => void;
}): React.ReactElement {
  void props;
  void PROVIDER;
  // TODO: <MapView provider={PROVIDER}>; fitToCoordinates(selected.path) on selection change;
  //       <Polyline tappable onPress={() => onSelect(key)}> per course; <Marker> at startPoint.
  throw new Error('not implemented');
}
