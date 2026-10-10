/**
 * Course Conditions sheet (form sheet over the tabs).
 *   /conditions              → empty sheet (Home button)
 *   /conditions?revise=1     → 「条件を直す」: prefilled with the current proposal's conditions
 * After 「この条件で提案」 the sheet closes; Home picks up the new proposal by itself.
 */
import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '@/convex/_generated/api';
import { CourseConditionsForm } from '@/features/course-conditions/course-conditions-form';

export default function ConditionsSheet() {
  const { revise } = useLocalSearchParams<{ revise?: string }>();
  const current = useQuery(api.proposals.current, revise ? {} : 'skip');
  if (revise && current === undefined) return null; // loading the conditions to prefill

  return (
    <CourseConditionsForm initial={current?.conditions} onRequested={() => router.back()} />
  );
}
