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
