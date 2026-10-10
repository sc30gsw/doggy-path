import { useMutation } from 'convex/react';
import { Button, Column, FieldGroup, Host, Picker, Switch, Text, TextInput } from '@expo/ui';
import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import {
  DOG_PROFILE_LIMITS,
  MONTHS,
  breedLabel,
  type BirthMonth,
  type Breed,
  type Month,
  type Owner,
  type Sex,
} from '@/convex/domain/dogProfile';
import { searchBreeds, type BreedOption } from '@/features/dog-profile/breed-search';
import {
  draftFromOwner,
  emptyDogProfileDraft,
  parseDogProfileDraft,
  type DogProfileDraft,
} from '@/features/dog-profile/dog-profile-draft';

const SEX_LABELS: Record<Sex, string> = { male: 'オス', female: 'メス' };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text>{message}</Text>;
}

function monthsFor(year: number, now: Date): readonly Month[] {
  if (year < now.getFullYear()) return MONTHS;
  const limit = now.getMonth() + 1;
  return MONTHS.filter((month) => month <= limit);
}

function isSex(value: string | number): value is Sex {
  return value === 'male' || value === 'female';
}

function isMonth(value: string | number, months: readonly Month[]): value is Month {
  return months.some((month) => month === value);
}

export function DogProfileForm(props: { initial?: Owner; submitLabel: string }) {
  const save = useMutation(api.owners.save);
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<DogProfileDraft>(() =>
    props.initial ? draftFromOwner(props.initial) : emptyDogProfileDraft(now),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DogProfileDraft, string>>>({});
  const [pending, setPending] = useState(false);

  const submit = () => {
    const parsed = parseDogProfileDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setPending(true);
    setErrors({});
    void save({ owner: parsed.value })
      .catch(() => {
        setErrors({ ownerName: '保存できませんでした' });
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="飼い主">
          <TextInput
            defaultValue={draft.ownerName}
            placeholder="名前"
            onChangeText={(ownerName) => {
              setDraft((current) => ({ ...current, ownerName }));
            }}
          />
          <FieldError message={errors.ownerName} />
        </FieldGroup.Section>
        <FieldGroup.Section title="わんちゃん">
          <TextInput
            defaultValue={draft.dogName}
            placeholder="名前"
            onChangeText={(dogName) => {
              setDraft((current) => ({ ...current, dogName }));
            }}
          />
          <FieldError message={errors.dogName} />
          <BreedField
            value={draft.breed}
            error={errors.breed}
            onChange={(breed) => {
              setDraft((current) => ({ ...current, breed }));
            }}
          />
          <BirthMonthField
            now={now}
            value={{
              year: draft.birthYear,
              month: draft.birthMonth,
              estimated: draft.birthMonthEstimated,
            }}
            error={errors.birthYear ?? errors.birthMonth}
            onChange={(value) => {
              setDraft((current) => ({
                ...current,
                birthYear: value.year,
                birthMonth: value.month,
                birthMonthEstimated: value.estimated,
              }));
            }}
          />
          <SexField
            sex={draft.sex}
            error={errors.sex}
            onChange={(sex) => {
              setDraft((current) => ({ ...current, sex }));
            }}
          />
          <TextInput
            defaultValue={draft.weightKg}
            placeholder="体重 (kg)"
            keyboardType="decimal-pad"
            onChangeText={(weightKg) => {
              setDraft((current) => ({ ...current, weightKg }));
            }}
          />
          <FieldError message={errors.weightKg} />
          <TextInput
            defaultValue={draft.dogMemo}
            placeholder="メモ"
            multiline
            onChangeText={(dogMemo) => {
              setDraft((current) => ({ ...current, dogMemo }));
            }}
          />
          <FieldError message={errors.dogMemo} />
        </FieldGroup.Section>
      </FieldGroup>
      <Column spacing={8}>
        <Button label={props.submitLabel} disabled={pending} onPress={submit} />
      </Column>
    </Host>
  );
}

function SexField(props: { sex: Sex | null; error?: string; onChange: (sex: Sex) => void }) {
  return (
    <Column spacing={8}>
      <Picker
        selectedValue={props.sex ?? 'unselected'}
        onValueChange={(value) => {
          if (isSex(value)) props.onChange(value);
        }}
      >
        <Picker.Item label="性別" value="unselected" />
        <Picker.Item label={SEX_LABELS.male} value="male" />
        <Picker.Item label={SEX_LABELS.female} value="female" />
      </Picker>
      <FieldError message={props.error} />
    </Column>
  );
}

function OtherBreedText(props: { value: Breed | null; onChange: (breed: Breed) => void }) {
  if (props.value?.kind !== 'other') return null;
  return (
    <TextInput
      defaultValue={props.value.text}
      placeholder="犬種"
      onChangeText={(text) => {
        props.onChange({ kind: 'other', text });
      }}
    />
  );
}

function BreedField(props: {
  value: Breed | null;
  onChange: (breed: Breed) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = searchBreeds(query);

  return (
    <View>
      <Button
        variant="outlined"
        label={props.value ? breedLabel(props.value) : '犬種を選ぶ'}
        onPress={() => setOpen(true)}
      />
      <FieldError message={props.error} />
      <OtherBreedText value={props.value} onChange={props.onChange} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Host matchContents={{ vertical: true }}>
          <TextInput placeholder="犬種を検索" onChangeText={setQuery} />
        </Host>
        <FlatList
          data={options}
          keyExtractor={(item) => (item.kind === 'jkc' ? item.id : item.kind)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                props.onChange(breedFromOption(item));
                setOpen(false);
              }}
            >
              <Text>{item.label}</Text>
            </Pressable>
          )}
        />
      </Modal>
    </View>
  );
}

function breedFromOption(option: BreedOption): Breed {
  if (option.kind === 'jkc') return { kind: 'jkc', id: option.id };
  if (option.kind === 'mixed') return { kind: 'mixed' };
  return { kind: 'other', text: '' };
}

function BirthMonthField(props: {
  now: Date;
  value: BirthMonth;
  onChange: (value: BirthMonth) => void;
  error?: string;
}) {
  const thisYear = props.now.getFullYear();
  const years: number[] = [];
  for (let year = thisYear; year >= DOG_PROFILE_LIMITS.earliestBirthYear; year -= 1) {
    years.push(year);
  }
  const months = monthsFor(props.value.year, props.now);

  return (
    <Column spacing={8}>
      <Picker
        selectedValue={props.value.year}
        onValueChange={(year) => {
          if (typeof year !== 'number') return;
          const available = monthsFor(year, props.now);
          const month = available.includes(props.value.month)
            ? props.value.month
            : available[available.length - 1];
          if (month === undefined) return;
          props.onChange({ ...props.value, year, month });
        }}
      >
        {years.map((year) => (
          <Picker.Item key={year} label={`${year}年`} value={year} />
        ))}
      </Picker>
      <Picker
        selectedValue={props.value.month}
        onValueChange={(month) => {
          if (isMonth(month, months)) props.onChange({ ...props.value, month });
        }}
      >
        {months.map((month) => (
          <Picker.Item key={month} label={`${month}月`} value={month} />
        ))}
      </Picker>
      <Switch
        label="推定"
        value={props.value.estimated}
        onValueChange={(estimated) => props.onChange({ ...props.value, estimated })}
      />
      <FieldError message={props.error} />
    </Column>
  );
}
