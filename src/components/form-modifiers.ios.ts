import type { FieldGroupProps } from '@expo/ui';
import { scrollDismissesKeyboard } from '@expo/ui/swift-ui/modifiers';

export const FORM_MODIFIERS: NonNullable<FieldGroupProps['modifiers']> = [
  scrollDismissesKeyboard('immediately'),
];
