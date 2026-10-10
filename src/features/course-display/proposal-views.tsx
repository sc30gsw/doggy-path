import { Button, Column, Host, Row, Spacer, Text } from '@expo/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text as NativeText, View } from 'react-native';

import { CenteredButton } from '@/components/form-rows';
import type { ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ShownCourse, ShownCourses } from '@/convex/domain/proposalView';
import { CourseMap } from '@/features/course-display/course-map';
import {
  BY_LENGTH_NOTICE,
  FAILURE_LABELS,
  REASON_LABELS,
  START_POINT_NOTES,
  UNSUITABLE_LABEL,
  WARNING_LABELS,
  WORKING_LABELS,
  allUnsuitableNotice,
  retryCountdownLabel,
} from '@/features/course-display/labels';
import { usePalette } from '@/hooks/use-palette';

const PROPOSE_LABEL = 'コースを提案してもらう';

function StatusCard(props: { children: ReactNode }) {
  return (
    <Host style={{ flex: 1 }}>
      <Column alignment="center" spacing={16} style={{ padding: 24 }}>
        {props.children}
      </Column>
    </Host>
  );
}

function Headline(props: { children: string }) {
  return (
    <Text textStyle={{ fontSize: 20, fontWeight: '600', textAlign: 'center' }}>
      {props.children}
    </Text>
  );
}

function Caption(props: { children: string; align?: 'left' | 'center' }) {
  const palette = usePalette();
  return (
    <Text
      textStyle={{
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: props.align ?? 'center',
      }}
    >
      {props.children}
    </Text>
  );
}

export function IdleView(props: { onPropose: () => void }) {
  return (
    <StatusCard>
      <Headline>今日の散歩コースを提案します</Headline>
      <Caption>気分や距離を伝えると、周回コースを最大3つ作ります</Caption>
      <CenteredButton label={PROPOSE_LABEL} onPress={props.onPropose} />
    </StatusCard>
  );
}

export function WorkingView(props: { step: 'checking' | 'building' }) {
  const palette = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" />
      <NativeText style={{ fontSize: 17, color: palette.text }}>
        {WORKING_LABELS[props.step]}
      </NativeText>
    </View>
  );
}

export function NeedsConfirmationView(props: {
  warnings: ConditionWarning[];
  onProceed: () => Promise<null>;
  onRevise: () => void;
}) {
  return (
    <StatusCard>
      {props.warnings.map((warning) => (
        <Headline key={warning}>{WARNING_LABELS[warning]}</Headline>
      ))}
      <CenteredButton label="このまま作る" onPress={() => void props.onProceed()} />
      <CenteredButton variant="text" label="条件を変える" onPress={props.onRevise} />
    </StatusCard>
  );
}

export function ReadyView(props: {
  dogName: string;
  startPoint: ResolvedStartPoint;
  shown: ShownCourses;
  onPropose: () => void;
}) {
  const courses = props.shown.bestFirst;
  const [selectedKey, setSelectedKey] = useState(courses[0]?.key ?? '');
  const selected = courses.find((course) => course.key === selectedKey) ?? courses[0];
  const note = START_POINT_NOTES[props.startPoint.source];

  return (
    <View style={{ flex: 1 }}>
      <Host matchContents={{ vertical: true }}>
        <Column alignment="start" spacing={8} style={{ padding: 16 }}>
          <ReadyNotice dogName={props.dogName} shown={props.shown} />
          {selected ? <CourseSummary course={selected} shown={props.shown} /> : null}
          {note ? <Caption align="left">{note}</Caption> : null}
          <Row alignment="center" spacing={8}>
            <CourseSwitcher courses={courses} selectedKey={selectedKey} onSelect={setSelectedKey} />
            <Spacer />
            <Button variant="text" label={PROPOSE_LABEL} onPress={props.onPropose} />
          </Row>
        </Column>
      </Host>
      <CourseMap
        startPoint={props.startPoint.point}
        courses={courses}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
      />
    </View>
  );
}

export function FailedView(props: {
  reason: FailureReason;
  retryableAt: number;
  onRetry: () => Promise<null>;
  onPropose: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remainingMs = props.retryableAt - now;
  const waiting = remainingMs > 0;

  return (
    <StatusCard>
      <Headline>{FAILURE_LABELS[props.reason]}</Headline>
      <CenteredButton
        label={waiting ? retryCountdownLabel(Math.ceil(remainingMs / 1000)) : 'もう一度試す'}
        disabled={waiting}
        onPress={() => void props.onRetry()}
      />
      <CenteredButton variant="text" label={PROPOSE_LABEL} onPress={props.onPropose} />
    </StatusCard>
  );
}

function ReadyNotice(props: { dogName: string; shown: ShownCourses }) {
  if (props.shown.order === 'byLength') return <Caption align="left">{BY_LENGTH_NOTICE}</Caption>;
  if (!props.shown.allUnsuitable) return null;
  return <Caption align="left">{allUnsuitableNotice(props.dogName)}</Caption>;
}

function CourseSummary(props: { course: ShownCourse; shown: ShownCourses }) {
  const minutes = `${props.course.estimatedMinutes}分`;
  const distance = `${(props.course.distanceM / 1000).toFixed(1)}km`;
  const headline = (
    <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>{`${distance}・${minutes}`}</Text>
  );
  if (props.shown.order !== 'recommended') return headline;
  const match = props.shown.bestFirst.find((course) => course.key === props.course.key);
  return (
    <Column alignment="start" spacing={4}>
      {headline}
      {match ? <Text>{REASON_LABELS[match.reason]}</Text> : null}
      {match?.unsuitable ? <Caption align="left">{UNSUITABLE_LABEL}</Caption> : null}
    </Column>
  );
}

function CourseSwitcher(props: {
  courses: ShownCourse[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Row spacing={8}>
      {props.courses.map((course, index) => (
        <Button
          key={course.key}
          variant={course.key === props.selectedKey ? 'filled' : 'outlined'}
          label={`${index + 1}`}
          onPress={() => props.onSelect(course.key)}
        />
      ))}
    </Row>
  );
}
