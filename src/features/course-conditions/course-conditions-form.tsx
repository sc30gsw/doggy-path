import { Column, FieldGroup, Host, RNHostView, Text, TextInput } from '@expo/ui';
import { useState } from 'react';

import { FORM_MODIFIERS } from '@/components/form-modifiers';
import { CenteredButton } from '@/components/form-rows';
import type { CourseConditions } from '@/convex/domain/courseConditions';
import {
  EMPTY_CONDITIONS_DRAFT,
  draftFromConditions,
  parseConditionsDraft,
  type ConditionsDraft,
} from '@/features/course-conditions/conditions-draft';
import { REFUSAL_LABELS } from '@/features/course-conditions/labels';
import { START_POINT_HINT, StartPointRows } from '@/features/course-conditions/start-point-field';
import { useRequestProposal } from '@/features/course-conditions/use-request-proposal';
import { MOOD_CHIPS_HEIGHT, MoodChips } from '@/features/course-conditions/mood-chips';
import { usePalette } from '@/hooks/use-palette';

export function CourseConditionsForm(props: {
  initial?: CourseConditions;
  onRequested: () => void;
}) {
  const [draft, setDraft] = useState<ConditionsDraft>(() =>
    props.initial ? draftFromConditions(props.initial) : EMPTY_CONDITIONS_DRAFT,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ConditionsDraft, string>>>({});
  const [pending, setPending] = useState(false);
  const [refusal, setRefusal] = useState<keyof typeof REFUSAL_LABELS | undefined>();
  const requestProposal = useRequestProposal();
  const palette = usePalette();

  const submit = () => {
    const parsed = parseConditionsDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setPending(true);
    setErrors({});
    setRefusal(undefined);
    void requestProposal(parsed.value).then((outcome) => {
      setPending(false);
      if (!outcome.ok) {
        setRefusal(outcome.refusal);
        return;
      }
      props.onRequested();
    });
  };

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup modifiers={FORM_MODIFIERS}>
        <FieldGroup.Section title="今日の気分">
          <Column style={{ height: MOOD_CHIPS_HEIGHT }}>
            <RNHostView>
              <MoodChips
                value={draft.mood}
                onChange={(mood) => {
                  setDraft((current) => ({ ...current, mood }));
                }}
              />
            </RNHostView>
          </Column>
          <TextInput
            defaultValue={draft.todayMemo}
            placeholder="今日のメモ"
            multiline
            onChangeText={(todayMemo) => {
              setDraft((current) => ({ ...current, todayMemo }));
            }}
          />
          {fieldNote(errors.todayMemo, palette)}
        </FieldGroup.Section>
        <FieldGroup.Section title="目安">
          <TextInput
            defaultValue={draft.targetDistanceKm}
            placeholder="距離 (km)"
            keyboardType="decimal-pad"
            onChangeText={(targetDistanceKm) => {
              setDraft((current) => ({ ...current, targetDistanceKm }));
            }}
          />
          {fieldNote(errors.targetDistanceKm, palette)}
          <TextInput
            defaultValue={draft.targetTimeMin}
            placeholder="時間 (分)"
            keyboardType="number-pad"
            onChangeText={(targetTimeMin) => {
              setDraft((current) => ({ ...current, targetTimeMin }));
            }}
          />
          {fieldNote(errors.targetTimeMin, palette)}
        </FieldGroup.Section>
        <FieldGroup.Section title="開始地点">
          <StartPointRows
            value={draft.chosenStartPoint}
            onChange={(chosenStartPoint) => {
              setDraft((current) => ({ ...current, chosenStartPoint }));
            }}
          />
          {draft.chosenStartPoint === null ? (
            <FieldGroup.SectionFooter>
              <Text>{START_POINT_HINT}</Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
        <FieldGroup.Section>
          <CenteredButton label="この条件で提案" disabled={pending} onPress={submit} />
          {refusal ? (
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: palette.danger }}>{REFUSAL_LABELS[refusal]}</Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}

function fieldNote(message: string | undefined, palette: ReturnType<typeof usePalette>) {
  if (!message) return null;
  return <Text textStyle={{ color: palette.danger }}>{message}</Text>;
}
