import { DEFAULT_POINT_NAME, type ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ProposalStatus } from '@/convex/domain/proposalView';
import type { FitKind } from '@/convex/domain/ranking';

export const REASON_LABELS: Record<FitKind, string> = {
  body: 'わんちゃんの体に合っています',
  mood: '今日の気分にぴったり',
};

export const BY_LENGTH_NOTICE = 'おすすめ順ではありません';

export const UNSUITABLE_LABEL = '今日は不向きかもしれません';

export const allUnsuitableNotice = (dogName: string): string =>
  `今日の${dogName}には、どのコースも負担が大きいかもしれません`;

export const retryCountdownLabel = (seconds: number): string => `${seconds}秒後にもう一度試せます`;

export const WARNING_LABELS: Record<ConditionWarning, string> = {
  targetsInconsistent: '距離と時間の組み合わせが合っていないかもしれません',
  tooMuchLoad: '今日のわんちゃんには負担が大きいかもしれません',
};

export const FAILURE_LABELS: Record<FailureReason, string> = {
  routingUnavailable: 'コースを作るサービスに接続できませんでした',
  noLoopFound: 'この開始地点の近くで周回コースが見つかりませんでした',
  timedOut: '時間がかかりすぎたため中断しました',
  internal: 'コースを作れませんでした',
};

export const WORKING_LABELS: Record<Extract<ProposalStatus, { kind: 'working' }>['step'], string> =
  {
    checking: '条件を確認しています…',
    building: 'コースを作っています…',
  };

export const START_POINT_NOTES: Record<ResolvedStartPoint['source'], string | null> = {
  chosen: null,
  device: '現在地から作りました',
  previous: '前回の開始地点から作りました',
  default: `${DEFAULT_POINT_NAME}から作りました`,
};
