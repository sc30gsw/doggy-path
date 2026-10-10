import { Button, Host } from '@expo/ui';
import { router } from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';

import {
  FailedView,
  NeedsConfirmationView,
  ReadyView,
  WorkingView,
} from '@/features/course-display/proposal-views';
import { useProposal, type ProposalScreen } from '@/features/course-display/use-proposal';

export default function HomeScreen() {
  const screen = useProposal();
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ProposalBody screen={screen} />
      {screen.phase === 'working' ? null : <ProposeButton />}
    </View>
  );
}

function ProposeButton() {
  return (
    <Host matchContents>
      <Button label="コースを提案してもらう" onPress={() => router.push('/conditions')} />
    </Host>
  );
}

function ProposalBody({ screen }: { screen: ProposalScreen }) {
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
      return (
        <ReadyView dogName={screen.dogName} startPoint={screen.startPoint} shown={screen.shown} />
      );
    case 'failed':
      return (
        <FailedView
          reason={screen.reason}
          retryableAt={screen.retryableAt}
          onRetry={screen.retry}
        />
      );
    default: {
      const unhandled: never = screen;
      return unhandled;
    }
  }
}
