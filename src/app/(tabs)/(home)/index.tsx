import { router } from 'expo-router';
import { View } from 'react-native';

import {
  FailedView,
  IdleView,
  NeedsConfirmationView,
  ReadyView,
  WorkingView,
} from '@/features/course-display/proposal-views';
import { useProposal, type ProposalScreen } from '@/features/course-display/use-proposal';
import { usePalette } from '@/hooks/use-palette';

const openConditions = () => router.push('/conditions');

export default function HomeScreen() {
  const screen = useProposal();
  const palette = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ProposalBody screen={screen} />
    </View>
  );
}

function ProposalBody({ screen }: { screen: ProposalScreen }) {
  switch (screen.phase) {
    case 'loading':
      return null;
    case 'none':
      return <IdleView onPropose={openConditions} />;
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
      return (
        <ReadyView
          dogName={screen.dogName}
          startPoint={screen.startPoint}
          shown={screen.shown}
          onPropose={openConditions}
        />
      );
    case 'failed':
      return (
        <FailedView
          reason={screen.reason}
          retryableAt={screen.retryableAt}
          onRetry={screen.retry}
          onPropose={openConditions}
        />
      );
    default: {
      const unhandled: never = screen;
      return unhandled;
    }
  }
}
