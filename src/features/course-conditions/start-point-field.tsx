import { Button, Column, RNHostView, Row, Text } from '@expo/ui';
import { useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { DEFAULT_POINT, DEFAULT_POINT_NAME, type LatLng } from '@/convex/domain/courseConditions';
import { getDeviceLocation } from '@/features/course-conditions/device-location';
import { usePalette } from '@/hooks/use-palette';

export const START_POINT_HINT = `未指定のときは現在地 → 前回の開始地点 → ${DEFAULT_POINT_NAME} の順に使います`;
const MAP_HEIGHT = 220;
const LOCATION_UNAVAILABLE = '現在地を取得できませんでした';

function regionFor(point: LatLng) {
  return { ...point, latitudeDelta: 0.02, longitudeDelta: 0.02 };
}

export function StartPointRows(props: {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
}) {
  const [notice, setNotice] = useState<string | undefined>();
  const palette = usePalette();
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
    <>
      <Column style={{ height: MAP_HEIGHT }}>
        <RNHostView>
          <View style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
            <MapView style={{ flex: 1 }} initialRegion={regionFor(center)} onLongPress={dropPin}>
              {props.value ? <Marker coordinate={props.value} /> : null}
            </MapView>
          </View>
        </RNHostView>
      </Column>
      {notice ? <Text textStyle={{ color: palette.danger }}>{notice}</Text> : null}
      <Row spacing={16}>
        <Button variant="text" label="現在地" onPress={useDeviceLocation} />
        <Button
          variant="text"
          label="クリア"
          disabled={props.value === null}
          onPress={() => {
            setNotice(undefined);
            props.onChange(null);
          }}
        />
      </Row>
    </>
  );
}
