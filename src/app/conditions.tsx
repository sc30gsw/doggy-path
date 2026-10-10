import { router } from 'expo-router';

import { CourseConditionsForm } from '@/features/course-conditions/course-conditions-form';

export default function ConditionsSheet() {
  return <CourseConditionsForm onRequested={() => router.back()} />;
}
