import {
  PotentScanHit,
  PotentScanNearMiss,
} from '../domain/value-objects/potent-scan-stock';

export const hit = (
  symbol: string,
  overrides: Partial<PotentScanHit> = {},
): PotentScanHit => ({
  symbol,
  exchange: 'NASDAQ',
  changePct: 12.5,
  close: 42.1,
  adrPct: 5.2,
  relativeVolume: 3.4,
  marketCap: 1.2e9,
  sector: 'Technology',
  industry: 'Semiconductors',
  ema9: 40,
  ema21: 38,
  ema50: 35,
  tier: 'Lead',
  ...overrides,
});

export const nearMiss = (
  symbol: string,
  overrides: Partial<PotentScanNearMiss> = {},
): PotentScanNearMiss => ({
  ...hit(symbol, { tier: null, ema50: null }),
  valueTraded: 4e6,
  avgValueTraded30d: 2e6,
  ...overrides,
});
