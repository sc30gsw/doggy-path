import { Button, Column, FieldGroup, Host, Text, TextInput } from '@expo/ui';
import { useState } from 'react';

import type { CourseConditions } from '@/convex/domain/courseConditions';
import {
  EMPTY_CONDITIONS_DRAFT,
  draftFromConditions,
  parseConditionsDraft,
  type ConditionsDraft,
} from '@/features/course-conditions/conditions-draft';
import { REFUSAL_LABELS } from '@/features/course-conditions/labels';
import { MoodChips } from '@/features/course-conditions/mood-chips';
import { StartPointField } from '@/features/course-conditions/start-point-field';
import { useRequestProposal } from '@/features/course-conditions/use-request-proposal';

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
      <FieldGroup>
        <FieldGroup.Section title="今日の気分">
          <MoodChips
            value={draft.mood}
            onChange={(mood) => {
              setDraft((current) => ({ ...current, mood }));
            }}
          />
          <TextInput
            defaultValue={draft.todayMemo}
            placeholder="今日のメモ"
            multiline
            onChangeText={(todayMemo) => {
              setDraft((current) => ({ ...current, todayMemo }));
            }}
          />
          <FieldNote message={errors.todayMemo} />
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
          <FieldNote message={errors.targetDistanceKm} />
          <TextInput
            defaultValue={draft.targetTimeMin}
            placeholder="時間 (分)"
            keyboardType="number-pad"
            onChangeText={(targetTimeMin) => {
              setDraft((current) => ({ ...current, targetTimeMin }));
            }}
          />
          <FieldNote message={errors.targetTimeMin} />
          <StartPointField
            value={draft.chosenStartPoint}
            onChange={(chosenStartPoint) => {
              setDraft((current) => ({ ...current, chosenStartPoint }));
            }}
          />
        </FieldGroup.Section>
      </FieldGroup>
      <Column spacing={8}>
        <FieldNote message={refusalText(refusal)} />
        <Button label="この条件で提案" disabled={pending} onPress={submit} />
      </Column>
    </Host>
  );
}

function refusalText(refusal: keyof typeof REFUSAL_LABELS | undefined): string | undefined {
  if (!refusal) return;
  return REFUSAL_LABELS[refusal];
}

function FieldNote({ message }: { message?: string }) {
  if (!message) return null;
  return <Text>{message}</Text>;
}
