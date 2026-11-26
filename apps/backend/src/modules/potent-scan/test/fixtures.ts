import { Symbol } from '../../../shared/value-objects/symbol';
import {
  Cluster,
  ClusterData,
  ClusterMember,
} from '../domain/entities/cluster';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { SessionDate } from '../domain/value-objects/session-date';
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

export const CLUSTER_ID = '11111111-1111-4111-8111-111111111111';
export const JOINED_AT = new Date('2026-11-26T22:00:00.000Z');

export const memberId = (ticker: string, n = 0): string =>
  `00000000-0000-4000-800${n}-${Buffer.from(ticker).toString('hex').padStart(12, '0')}`;

export const clusterMember = (
  ticker: string,
  overrides: Partial<ClusterMember> = {},
): ClusterMember => ({
  id: memberId(ticker),
  ticker: Symbol.of(ticker),
  joinedAt: JOINED_AT,
  reason: null,
  catalyst: null,
  source: null,
  removedAt: null,
  ...overrides,
});

export const clusterData = (
  overrides: Partial<ClusterData> = {},
): ClusterData => ({
  id: ClusterId.of(CLUSTER_ID),
  name: 'Nuclear',
  description: 'SMR names',
  sharedCatalyst: null,
  sources: [],
  originProposalId: null,
  sourceScanDate: SessionDate.of('2026-11-25'),
  createdAt: JOINED_AT,
  status: 'tracking',
  closedAt: null,
  members: [clusterMember('AAA'), clusterMember('BBB')],
  ...overrides,
});

export const cluster = (overrides: Partial<ClusterData> = {}): Cluster =>
  Cluster.fromData(clusterData(overrides));
