import { DailyTierCounts, MemberTier } from '../value-objects/member-tier';
import { ClusterId } from '../value-objects/cluster-id';

export interface MemberTierRepository {
  saveAll(tiers: MemberTier[]): Promise<void>;
  findByCluster(clusterId: ClusterId): Promise<MemberTier[]>;
  dailyCountsByCluster(
    clusterIds: ClusterId[],
  ): Promise<Map<string, DailyTierCounts[]>>;
  activeLeadCountsOnLatestDate(
    clusterIds: ClusterId[],
  ): Promise<Map<string, number>>;
}
