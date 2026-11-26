import { Cluster, ClusterStatus } from '../domain/entities/cluster';
import {
  DailyTierCounts,
  MemberTier,
} from '../domain/value-objects/member-tier';
import { Tier } from '../domain/value-objects/potent-scan-stock';

export interface ClusterMemberDto {
  ticker: string;
  joinedAt: string;
  reason: string | null;
  catalyst: string | null;
  source: string | null;
  removedAt: string | null;
}

export interface ClusterDto {
  id: string;
  name: string;
  description: string;
  sharedCatalyst: string | null;
  sources: string[];
  origin: string;
  sourceScanDate: string;
  createdAt: string;
  status: ClusterStatus;
  closedAt: string | null;
  members: ClusterMemberDto[];
}

export const toClusterDto = (cluster: Cluster): ClusterDto => ({
  id: cluster.id.value,
  name: cluster.name,
  description: cluster.description,
  sharedCatalyst: cluster.sharedCatalyst,
  sources: cluster.sources,
  origin: cluster.originProposalId ?? 'manual',
  sourceScanDate: cluster.sourceScanDate.value,
  createdAt: cluster.createdAt.toISOString(),
  status: cluster.status,
  closedAt: cluster.closedAt?.toISOString() ?? null,
  members: cluster.members.map((member) => ({
    ticker: member.ticker.value,
    joinedAt: member.joinedAt.toISOString(),
    reason: member.reason,
    catalyst: member.catalyst,
    source: member.source,
    removedAt: member.removedAt?.toISOString() ?? null,
  })),
});

export interface MemberTierPointDto {
  date: string;
  tier: Tier;
}

export interface ClusterMemberDetailDto extends ClusterMemberDto {
  tiers: MemberTierPointDto[];
  returnSinceJoinPct: number | null;
  adrPct: number | null;
}

export interface DailyTierCountsDto {
  date: string;
  lead: number;
  mediocre: number;
  lag: number;
}

export interface ClusterDetailDto extends ClusterDto {
  members: ClusterMemberDetailDto[];
  dailyTierCounts: DailyTierCountsDto[];
}

export interface LeadSharePointDto {
  date: string;
  share: number;
}

export interface ClusterSummaryDto extends ClusterDto {
  leadCount: number;
  leadShare: LeadSharePointDto[];
}

export const toClusterDetailDto = (
  cluster: Cluster,
  tiers: MemberTier[],
  dailyCounts: DailyTierCounts[],
): ClusterDetailDto => {
  const base = toClusterDto(cluster);
  return {
    ...base,
    members: cluster.members.map((member, index) => {
      const series = tiers.filter((tier) => tier.memberId === member.id);
      const first = series.at(0);
      const last = series.at(-1);
      return {
        ...base.members[index],
        tiers: series.map((tier) => ({
          date: tier.date.value,
          tier: tier.tier,
        })),
        returnSinceJoinPct:
          first && last ? (last.close / first.close - 1) * 100 : null,
        adrPct: last?.adrPct ?? null,
      };
    }),
    dailyTierCounts: dailyCounts.map((counts) => ({
      date: counts.date.value,
      lead: counts.lead,
      mediocre: counts.mediocre,
      lag: counts.lag,
    })),
  };
};

export const toClusterSummaryDto = (
  cluster: Cluster,
  dailyCounts: DailyTierCounts[],
  activeLeadCount: number,
): ClusterSummaryDto => ({
  ...toClusterDto(cluster),
  leadCount: activeLeadCount,
  leadShare: dailyCounts.map((counts) => ({
    date: counts.date.value,
    share: counts.lead / (counts.lead + counts.mediocre + counts.lag),
  })),
});
