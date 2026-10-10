import type { CourseConditions } from '../domain/courseConditions';
import type { DogProfile } from '../domain/dogProfile';
import type { Assessment, ConditionWarning, Course, CourseScoring } from '../domain/proposal';
import { lengthBasisOf, targetsAreConsistent, type WalkingPace } from '../domain/walk';
import { askJev, type AskJev, type JevFailure } from './internal/jev';
import {
  conditionQuestions,
  dogState,
  fallbackAssessment,
  fitQuestions,
  interpretConditions,
  interpretFit,
  todayState,
} from './internal/questions';

export async function judgeConditions({
  dog,
  conditions,
  now,
  ask = askJev,
}: {
  dog: DogProfile;
  conditions: CourseConditions;
  now: Date;
  ask?: AskJev;
}): Promise<Assessment> {
  const basis = lengthBasisOf(conditions);
  const result = await ask({
    state: { dog: dogState({ dog, now }), today: todayState(conditions) },
    questions: conditionQuestions(),
  });
  if (!result.ok) logJevFailure(result.failure);
  const assessment = result.ok
    ? interpretConditions({ basis, answers: result.answers })
    : fallbackAssessment(basis);
  return {
    ...assessment,
    warnings: [...targetsWarnings({ conditions, pace: assessment.pace }), ...assessment.warnings],
  };
}

function logJevFailure(failure: JevFailure): void {
  console.error(JSON.stringify({ event: 'jevFailed', failure }));
}

function targetsWarnings({
  conditions: { targetDistanceM, targetTimeMin },
  pace,
}: {
  conditions: CourseConditions;
  pace: WalkingPace;
}): ConditionWarning[] {
  if (targetDistanceM === undefined || targetTimeMin === undefined) return [];
  return targetsAreConsistent({ targetDistanceM, targetTimeMin, pace })
    ? []
    : ['targetsInconsistent'];
}

export async function judgeCourseFits({
  dog,
  conditions,
  assessment,
  courses,
  now,
  ask = askJev,
}: {
  dog: DogProfile;
  conditions: CourseConditions;
  assessment: Assessment;
  courses: readonly Course[];
  now: Date;
  ask?: AskJev;
}): Promise<CourseScoring> {
  const hasMood = conditions.mood !== undefined;
  const result = await ask({
    state: { dog: dogState({ dog, now }), today: todayState(conditions) },
    questions: fitQuestions({ courses, pace: assessment.pace, hasMood }),
  });
  if (!result.ok) {
    logJevFailure(result.failure);
    return { kind: 'byLength', courses: [...courses] };
  }
  return {
    kind: 'byFit',
    scored: courses.map((course) => ({
      course,
      fit: interpretFit({ answers: result.answers, courseKey: course.key, hasMood }),
    })),
  };
}
