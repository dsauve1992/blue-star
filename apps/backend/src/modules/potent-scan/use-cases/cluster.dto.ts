import { Cluster, ClusterStatus } from '../domain/entities/cluster';

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
