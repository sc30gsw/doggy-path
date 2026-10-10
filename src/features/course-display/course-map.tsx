import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import type { LatLng } from '@/convex/domain/courseConditions';
import type { ShownCourse } from '@/convex/domain/proposalView';

const PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export function CourseMap(props: {
  startPoint: LatLng;
  courses: ShownCourse[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const selected = props.courses.find((course) => course.key === props.selectedKey);

  useEffect(() => {
    if (!selected) return;
    mapRef.current?.fitToCoordinates([props.startPoint, ...selected.path], {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [props.startPoint, selected]);

  return (
    <MapView ref={mapRef} provider={PROVIDER} style={{ flex: 1 }}>
      <Marker coordinate={props.startPoint} />
      {props.courses.map((course) => (
        <Polyline
          key={course.key}
          coordinates={course.path}
          tappable
          strokeColor={course.key === props.selectedKey ? '#0A6934' : '#8E8E93'}
          strokeWidth={course.key === props.selectedKey ? 5 : 3}
          onPress={() => props.onSelect(course.key)}
        />
      ))}
    </MapView>
  );
}
