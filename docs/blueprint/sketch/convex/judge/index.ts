import { lengthBasisOf } from '../domain/walk';
import type { CourseConditions } from '../domain/courseConditions';
import type { DogProfile } from '../domain/dogProfile';
import type { Assessment, Course, CourseScoring } from '../domain/proposal';
import { askJev, type AskJev } from './internal/jev';
import {
  conditionQuestions,
  coursesState,
  dogState,
  fallbackAssessment,
  fitQuestions,
  interpretConditions,
  interpretFit,
  todayState,
} from './internal/questions';

/** Never rejects for a Jev problem: an unavailable Jev yields the fallback Assessment. */
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
    questions: conditionQuestions({ conditions, basis }),
  });
  return result.ok ? interpretConditions({ basis, answers: result.answers }) : fallbackAssessment(basis);
}

/** Never rejects for a Jev problem: an unavailable Jev yields `byLength`. */
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
    state: {
      dog: dogState({ dog, now }),
      today: todayState(conditions),
      courses: coursesState({ courses, pace: assessment.pace }),
    },
    questions: fitQuestions({ courses, hasMood }),
  });
  if (!result.ok) return { kind: 'byLength', courses: [...courses] };
  return {
    kind: 'byFit',
    scored: courses.map((course) => ({
      course,
      fit: interpretFit({ answers: result.answers, courseKey: course.key, hasMood }),
    })),
  };
}
