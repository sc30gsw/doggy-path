import { useMutation } from 'convex/react';
import { Button, FieldGroup, Host, Picker, Switch, Text, TextInput } from '@expo/ui';
import { useState, type ReactNode } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
} from 'react-native';

import { FORM_MODIFIERS } from '@/components/form-modifiers';
import { CenteredButton, LabeledRow } from '@/components/form-rows';
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
import { usePalette } from '@/hooks/use-palette';
import { searchBreeds, type BreedOption } from '@/features/dog-profile/breed-search';
import {
  draftFromOwner,
  emptyDogProfileDraft,
  parseDogProfileDraft,
  type DogProfileDraft,
} from '@/features/dog-profile/dog-profile-draft';

const SEX_LABELS: Record<Sex, string> = { male: 'オス', female: 'メス' };

type SubmitState = 'idle' | 'saving' | 'saved' | 'invalid' | 'failed';

const SUBMIT_FOOTERS: Partial<
  Record<SubmitState, { text: string; tone: 'danger' | 'textSecondary' }>
> = {
  saved: { text: '保存しました', tone: 'textSecondary' },
  invalid: { text: '入力内容を確認してください', tone: 'danger' },
  failed: { text: '保存できませんでした', tone: 'danger' },
};

function FieldError(props: { message: string }) {
  const palette = usePalette();
  return <Text textStyle={{ color: palette.danger }}>{props.message}</Text>;
}

function fieldError(message: string | undefined) {
  return message ? <FieldError message={message} /> : null;
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

export function DogProfileForm(props: {
  initial?: Owner;
  submitLabel: string;
  children?: ReactNode;
}) {
  const save = useMutation(api.owners.save);
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<DogProfileDraft>(() =>
    props.initial ? draftFromOwner(props.initial) : emptyDogProfileDraft(now),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DogProfileDraft, string>>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [choosingBreed, setChoosingBreed] = useState(false);
  const palette = usePalette();

  const submit = () => {
    const parsed = parseDogProfileDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setSubmitState('invalid');
      return;
    }
    setErrors({});
    setSubmitState('saving');
    void save({ owner: parsed.value }).then(
      () => setSubmitState('saved'),
      () => setSubmitState('failed'),
    );
  };

  const setBreed = (breed: Breed) => {
    setDraft((current) => ({ ...current, breed }));
  };

  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup modifiers={FORM_MODIFIERS}>
          <FieldGroup.Section title="飼い主">
            <TextInput
              defaultValue={draft.ownerName}
              placeholder="名前"
              onChangeText={(ownerName) => {
                setDraft((current) => ({ ...current, ownerName }));
              }}
            />
            {fieldError(errors.ownerName)}
          </FieldGroup.Section>
          <FieldGroup.Section title="わんちゃん">
            <TextInput
              defaultValue={draft.dogName}
              placeholder="名前"
              onChangeText={(dogName) => {
                setDraft((current) => ({ ...current, dogName }));
              }}
            />
            {fieldError(errors.dogName)}
            <LabeledRow label="犬種">
              <Button
                variant="text"
                label={draft.breed ? breedLabel(draft.breed) : '犬種を選ぶ'}
                onPress={() => setChoosingBreed(true)}
              />
            </LabeledRow>
            {fieldError(errors.breed)}
            {draft.breed?.kind === 'other' ? (
              <OtherBreedText text={draft.breed.text} onChange={setBreed} />
            ) : null}
            <BirthMonthRows
              now={now}
              value={{
                year: draft.birthYear,
                month: draft.birthMonth,
                estimated: draft.birthMonthEstimated,
              }}
              onChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  birthYear: value.year,
                  birthMonth: value.month,
                  birthMonthEstimated: value.estimated,
                }));
              }}
            />
            {fieldError(errors.birthYear ?? errors.birthMonth)}
            <SexRow
              sex={draft.sex}
              onChange={(sex) => {
                setDraft((current) => ({ ...current, sex }));
              }}
            />
            {fieldError(errors.sex)}
            <TextInput
              defaultValue={draft.weightKg}
              placeholder="体重 (kg)"
              keyboardType="decimal-pad"
              onChangeText={(weightKg) => {
                setDraft((current) => ({ ...current, weightKg }));
              }}
            />
            {fieldError(errors.weightKg)}
            <TextInput
              defaultValue={draft.dogMemo}
              placeholder="メモ"
              multiline
              onChangeText={(dogMemo) => {
                setDraft((current) => ({ ...current, dogMemo }));
              }}
            />
            {fieldError(errors.dogMemo)}
          </FieldGroup.Section>
          <FieldGroup.Section>
            <CenteredButton
              label={props.submitLabel}
              disabled={submitState === 'saving'}
              onPress={submit}
            />
            {submitFooter(submitState, palette)}
          </FieldGroup.Section>
          {props.children}
        </FieldGroup>
      </Host>
      <BreedPicker
        visible={choosingBreed}
        onClose={() => setChoosingBreed(false)}
        onPick={(breed) => {
          if (breed.kind !== 'other' || draft.breed?.kind !== 'other') setBreed(breed);
          setChoosingBreed(false);
        }}
      />
    </>
  );
}

function submitFooter(state: SubmitState, palette: ReturnType<typeof usePalette>) {
  const footer = SUBMIT_FOOTERS[state];
  if (!footer) return null;
  return (
    <FieldGroup.SectionFooter>
      <Text textStyle={{ color: palette[footer.tone] }}>{footer.text}</Text>
    </FieldGroup.SectionFooter>
  );
}

function SexRow(props: { sex: Sex | null; onChange: (sex: Sex) => void }) {
  return (
    <LabeledRow label="性別">
      <Picker
        selectedValue={props.sex ?? 'unselected'}
        onValueChange={(value) => {
          if (isSex(value)) props.onChange(value);
        }}
      >
        <Picker.Item label="選択" value="unselected" />
        <Picker.Item label={SEX_LABELS.male} value="male" />
        <Picker.Item label={SEX_LABELS.female} value="female" />
      </Picker>
    </LabeledRow>
  );
}

function OtherBreedText(props: { text: string; onChange: (breed: Breed) => void }) {
  return (
    <TextInput
      defaultValue={props.text}
      placeholder="犬種"
      onChangeText={(text) => {
        props.onChange({ kind: 'other', text });
      }}
    />
  );
}

function BreedPicker(props: {
  visible: boolean;
  onClose: () => void;
  onPick: (breed: Breed) => void;
}) {
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <BreedSearch onClose={props.onClose} onPick={props.onPick} />
    </Modal>
  );
}

function BreedSearch(props: { onClose: () => void; onPick: (breed: Breed) => void }) {
  const [query, setQuery] = useState('');
  const palette = usePalette();
  const options = searchBreeds(query);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <NativeTextInput
          placeholder="犬種を検索"
          placeholderTextColor={palette.textSecondary}
          onChangeText={setQuery}
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 17,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            color: palette.text,
            backgroundColor: palette.backgroundElement,
          }}
        />
        <Pressable accessibilityRole="button" onPress={props.onClose} hitSlop={8}>
          <NativeText style={{ fontSize: 17, color: palette.tint }}>閉じる</NativeText>
        </Pressable>
      </View>
      <FlatList
        data={options}
        keyExtractor={(item) => (item.kind === 'jkc' ? item.id : item.kind)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => props.onPick(breedFromOption(item))}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <NativeText style={{ fontSize: 17, color: palette.text }}>{item.label}</NativeText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              marginLeft: 20,
              backgroundColor: palette.backgroundSelected,
            }}
          />
        )}
      />
    </View>
  );
}

function breedFromOption(option: BreedOption): Breed {
  if (option.kind === 'jkc') return { kind: 'jkc', id: option.id };
  if (option.kind === 'mixed') return { kind: 'mixed' };
  return { kind: 'other', text: '' };
}

function BirthMonthRows(props: {
  now: Date;
  value: BirthMonth;
  onChange: (value: BirthMonth) => void;
}) {
  const thisYear = props.now.getFullYear();
  const years: number[] = [];
  for (let year = thisYear; year >= DOG_PROFILE_LIMITS.earliestBirthYear; year -= 1) {
    years.push(year);
  }
  const months = monthsFor(props.value.year, props.now);

  return (
    <>
      <LabeledRow label="生まれ年">
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
      </LabeledRow>
      <LabeledRow label="生まれ月">
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
      </LabeledRow>
      <Switch
        label="推定"
        value={props.value.estimated}
        onValueChange={(estimated) => props.onChange({ ...props.value, estimated })}
      />
    </>
  );
}
