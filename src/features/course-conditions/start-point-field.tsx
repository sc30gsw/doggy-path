import { Button, Host } from '@expo/ui';
import { useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { DEFAULT_POINT, DEFAULT_POINT_NAME, type LatLng } from '@/convex/domain/courseConditions';
import { getDeviceLocation } from '@/features/course-conditions/device-location';

const START_POINT_HINT = `未指定のときは現在地 → 前回の開始地点 → ${DEFAULT_POINT_NAME} の順に使います`;
const LOCATION_UNAVAILABLE = '現在地を取得できませんでした';

function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return <Text>{message}</Text>;
}

function StartMarker({ point }: { point: LatLng | null }) {
  if (!point) return null;
  return <Marker coordinate={point} />;
}

function StartHint({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return <Text>{START_POINT_HINT}</Text>;
}

function regionFor(point: LatLng) {
  return { ...point, latitudeDelta: 0.02, longitudeDelta: 0.02 };
}

export function StartPointField(props: {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
}) {
  const [notice, setNotice] = useState<string | undefined>();
  const center = props.value ?? DEFAULT_POINT;

  const useDeviceLocation = () => {
    void getDeviceLocation().then((point) => {
      if (!point) {
        setNotice(LOCATION_UNAVAILABLE);
        return;
      }
      setNotice(undefined);
      props.onChange(point);
    });
  };

  const dropPin = (event: { nativeEvent: { coordinate: LatLng } }) => {
    setNotice(undefined);
    props.onChange(event.nativeEvent.coordinate);
  };

  return (
    <View>
      <Host matchContents>
        <Button label="現在地" onPress={useDeviceLocation} />
      </Host>
      <Notice message={notice} />
      <MapView style={{ height: 220 }} initialRegion={regionFor(center)} onLongPress={dropPin}>
        <StartMarker point={props.value} />
      </MapView>
      <Host matchContents>
        <Button
          variant="text"
          label="クリア"
          onPress={() => {
            setNotice(undefined);
            props.onChange(null);
          }}
        />
      </Host>
      <StartHint shown={props.value === null} />
    </View>
  );
}
