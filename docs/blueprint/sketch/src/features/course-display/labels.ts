/**
 * Japanese copy for the proposal's server-side codes. Each table is a `Record` over the
 * domain union, so a new reason/warning/failure fails the build here until it has copy.
 */
import type { ResolvedStartPoint } from '@/convex/domain/courseConditions';
import type { ConditionWarning, FailureReason } from '@/convex/domain/proposal';
import type { ProposalStatus } from '@/convex/domain/proposalView';
import type { FitKind } from '@/convex/domain/ranking';

/** The reason label on each recommended course: the higher of Body Fit / Mood Fit. */
export const REASON_LABELS: Record<FitKind, string> = {
  body: 'わんちゃんの体に合っています',
  mood: '今日の気分にぴったり',
};

export const BY_LENGTH_NOTICE = 'おすすめ順ではありません';

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

export const WORKING_LABELS: Record<Extract<ProposalStatus, { kind: 'working' }>['step'], string> = {
  checking: '条件を確認しています…',
  building: 'コースを作っています…',
};

export const START_POINT_NOTES: Record<ResolvedStartPoint['source'], string | null> = {
  chosen: null,
  device: '現在地から作りました',
  previous: '前回の開始地点から作りました',
  default: '東京駅から作りました',
};
