export type Tier = 'Lead' | 'Mediocre' | 'Lag';

export interface PotentScanHit {
  symbol: string;
  exchange: string;
  changePct: number;
  close: number | null;
  adrPct: number | null;
  relativeVolume: number | null;
  marketCap: number | null;
  sector: string;
  industry: string;
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  tier: Tier | null;
}

export interface PotentScanNearMiss extends PotentScanHit {
  valueTraded: number | null;
  avgValueTraded30d: number | null;
}
