import { Tier } from './potent-scan-stock';
import { SessionDate } from './session-date';

export interface MemberTier {
  memberId: string;
  date: SessionDate;
  tier: Tier;
  close: number;
  ema9: number;
  ema21: number;
  ema50: number;
  adrPct: number | null;
}

export interface DailyTierCounts {
  date: SessionDate;
  lead: number;
  mediocre: number;
  lag: number;
}

export function classifyTier(ema9: number, ema21: number, ema50: number): Tier {
  if (ema9 > ema21 && ema21 > ema50) return 'Lead';
  if (ema9 < ema21 && ema21 < ema50) return 'Lag';
  return 'Mediocre';
}
