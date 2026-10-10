import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import type { LatLng } from '@/convex/domain/courseConditions';
import type { ShownCourse } from '@/convex/domain/proposalView';

const PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export function CourseMap(props: {
  startPoint: LatLng;
  courses: ShownCourse[];
  selectedKey: string;
  onSelect: (key: string) => void;
}): React.ReactElement {
  void props;
  void PROVIDER;
  throw new Error('not implemented');
}
