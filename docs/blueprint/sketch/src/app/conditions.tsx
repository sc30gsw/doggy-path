import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '@/convex/_generated/api';
import { CourseConditionsForm } from '@/features/course-conditions/course-conditions-form';

export default function ConditionsSheet() {
  const { revise } = useLocalSearchParams<{ revise?: string }>();
  const current = useQuery(api.proposals.current, revise ? {} : 'skip');
  if (revise && current === undefined) return null;

  return (
    <CourseConditionsForm initial={current?.conditions} onRequested={() => router.back()} />
  );
}
