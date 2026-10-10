import { DAILY_PROPOSAL_CAP } from '@/convex/domain/tuning';

import type { RequestOutcome } from './use-request-proposal';

export const REFUSAL_LABELS: Record<Extract<RequestOutcome, { ok: false }>['refusal'], string> = {
  dailyLimitReached: `今日の提案は上限（${DAILY_PROPOSAL_CAP}回）に達しました。明日また試してください`,
};
