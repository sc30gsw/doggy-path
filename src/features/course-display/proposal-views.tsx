import { Button, Column, Host, Text } from '@expo/ui';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

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

export function WorkingView(props: { step: 'checking' | 'building' }) {
  return (
    <Host style={{ flex: 1 }}>
      <Text>{WORKING_LABELS[props.step]}</Text>
    </Host>
  );
}

export function NeedsConfirmationView(props: {
  warnings: ConditionWarning[];
  onProceed: () => Promise<null>;
  onRevise: () => void;
}) {
  return (
    <Host style={{ flex: 1 }}>
      <Column spacing={12}>
        {props.warnings.map((warning) => (
          <Text key={warning}>{WARNING_LABELS[warning]}</Text>
        ))}
        <Button label="このまま作る" onPress={() => void props.onProceed()} />
        <Button variant="text" label="条件を変える" onPress={props.onRevise} />
      </Column>
    </Host>
  );
}

export function ReadyView(props: {
  dogName: string;
  startPoint: ResolvedStartPoint;
  shown: ShownCourses;
}) {
  const courses = props.shown.bestFirst;
  const [selectedKey, setSelectedKey] = useState(courses[0]?.key ?? '');
  const selected = courses.find((course) => course.key === selectedKey) ?? courses[0];
  const note = START_POINT_NOTES[props.startPoint.source];

  return (
    <View style={{ flex: 1 }}>
      <CourseMap
        startPoint={props.startPoint.point}
        courses={courses}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
      />
      <Host matchContents={{ vertical: true }}>
        <Column spacing={8}>
          <ReadyNotice dogName={props.dogName} shown={props.shown} />
          {selected ? <CourseSummary course={selected} shown={props.shown} /> : null}
          {note ? <Text>{note}</Text> : null}
          <CourseSwitcher courses={courses} selectedKey={selectedKey} onSelect={setSelectedKey} />
        </Column>
      </Host>
    </View>
  );
}

export function FailedView(props: {
  reason: FailureReason;
  retryableAt: number;
  onRetry: () => Promise<null>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remainingMs = props.retryableAt - now;
  const waiting = remainingMs > 0;

  return (
    <Host style={{ flex: 1 }}>
      <Column spacing={12}>
        <Text>{FAILURE_LABELS[props.reason]}</Text>
        <Button
          label={waiting ? retryCountdownLabel(Math.ceil(remainingMs / 1000)) : 'もう一度試す'}
          disabled={waiting}
          onPress={() => void props.onRetry()}
        />
      </Column>
    </Host>
  );
}

function ReadyNotice(props: { dogName: string; shown: ShownCourses }) {
  if (props.shown.order === 'byLength') return <Text>{BY_LENGTH_NOTICE}</Text>;
  if (!props.shown.allUnsuitable) return null;
  return <Text>{allUnsuitableNotice(props.dogName)}</Text>;
}

function CourseSummary(props: { course: ShownCourse; shown: ShownCourses }) {
  const minutes = `${props.course.estimatedMinutes}分`;
  const distance = `${(props.course.distanceM / 1000).toFixed(1)}km`;
  if (props.shown.order !== 'recommended') return <Text>{`${distance}・${minutes}`}</Text>;
  const match = props.shown.bestFirst.find((course) => course.key === props.course.key);
  return (
    <Column spacing={4}>
      <Text>{`${distance}・${minutes}`}</Text>
      {match ? <Text>{REASON_LABELS[match.reason]}</Text> : null}
      {match?.unsuitable ? <Text>{UNSUITABLE_LABEL}</Text> : null}
    </Column>
  );
}

function CourseSwitcher(props: {
  courses: ShownCourse[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {props.courses.map((course, index) => (
        <Pressable
          key={course.key}
          accessibilityRole="button"
          onPress={() => props.onSelect(course.key)}
        >
          <Text>{`${index + 1}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}
