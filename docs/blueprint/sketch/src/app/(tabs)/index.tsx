/**
 * Home: the Owner's current proposal, live, under 「コースを提案してもらう」.
 * The screen is a pure function of `useProposal()`: Convex pushes each phase change, so
 * progress, the Condition Check warning, results and failures appear here without polling,
 * and survive the app being backgrounded or restarted.
 */
import { router } from 'expo-router';

import {
  FailedView,
  NeedsConfirmationView,
  ReadyView,
  WorkingView,
} from '@/features/course-display/proposal-views';
import { useProposal } from '@/features/course-display/use-proposal';

export default function HomeScreen(): React.ReactElement | null {
  const screen = useProposal();

  // TODO: wrap every case below with the 「コースを提案してもらう」 button
  //       (router.push('/conditions')), hidden while `working`.
  switch (screen.phase) {
    case 'loading':
    case 'none':
      return null;
    case 'working':
      return <WorkingView step={screen.step} />;
    case 'needsConfirmation':
      return (
        <NeedsConfirmationView
          warnings={screen.warnings}
          onProceed={screen.proceed}
          onRevise={() => router.push({ pathname: '/conditions', params: { revise: '1' } })}
        />
      );
    case 'ready':
      return <ReadyView startPoint={screen.startPoint} shown={screen.shown} />;
    case 'failed':
      return <FailedView reason={screen.reason} onRetry={screen.retry} />;
    default: {
      const unhandled: never = screen;
      return unhandled;
    }
  }
}
