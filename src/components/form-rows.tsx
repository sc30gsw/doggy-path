import { Button, Row, Spacer, Text, type ButtonVariant } from '@expo/ui';
import type { ReactNode } from 'react';

export function LabeledRow(props: { label: string; children: ReactNode }) {
  return (
    <Row alignment="center">
      <Text>{props.label}</Text>
      <Spacer />
      {props.children}
    </Row>
  );
}

export function CenteredButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
}) {
  return (
    <Row alignment="center">
      <Spacer />
      <Button
        label={props.label}
        variant={props.variant}
        disabled={props.disabled}
        onPress={props.onPress}
      />
      <Spacer />
    </Row>
  );
}
