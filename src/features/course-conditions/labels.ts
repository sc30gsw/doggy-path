const DAILY_PROPOSAL_CAP = 10;

export const REFUSAL_LABELS = {
  dailyLimitReached: `今日の提案は上限（${DAILY_PROPOSAL_CAP}回）に達しました。明日また試してください`,
} as const;
