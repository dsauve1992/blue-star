import { apiClient } from "../../global/api/api-instance";

export type Tier = "Lead" | "Mediocre" | "Lag";

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
  tier: Tier | null;
  isMomentumLeader: boolean;
}

export interface PotentScan {
  scanDate: string;
  universeSize: number;
  hits: PotentScanHit[];
}

export interface ClusterMember {
  ticker: string;
  joinedAt: string;
  reason: string | null;
  catalyst: string | null;
  source: string | null;
  removedAt: string | null;
}

export type ClusterStatus = "tracking" | "closed";

interface ClusterBase<TMember extends ClusterMember> {
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
  members: TMember[];
}

export interface LeadSharePoint {
  date: string;
  share: number;
}

export interface Cluster extends ClusterBase<ClusterMember> {
  leadCount: number;
  leadShare: LeadSharePoint[];
  dailyTierCounts: DailyTierCounts[];
}

export interface MemberTierPoint {
  date: string;
  tier: Tier;
}

export interface ClusterMemberDetail extends ClusterMember {
  tiers: MemberTierPoint[];
  returnSinceJoinPct: number | null;
  adrPct: number | null;
}

export interface DailyTierCounts {
  date: string;
  lead: number;
  mediocre: number;
  lag: number;
}

export interface ClusterDetail extends ClusterBase<ClusterMemberDetail> {
  dailyTierCounts: DailyTierCounts[];
}

export interface UpdateClusterRequest {
  name?: string;
  description?: string;
}

export interface CreateClusterRequest {
  name: string;
  description: string;
  tickers: string[];
  sourceScanDate: string;
}

export type ProposalStatus = "pending" | "accepted" | "edited" | "rejected";

export interface ProposedMember {
  ticker: string;
  reason: string;
  catalystToday: string;
  source: string | null;
}

export interface ProposedCluster {
  name: string;
  description: string;
  sharedCatalyst: string;
  sources: string[];
  members: ProposedMember[];
}

export interface ProposalAlternative {
  kind: "split" | "merge";
  description: string;
  clusters: ProposedCluster[];
}

interface ProposalDecision {
  id: string;
  status: ProposalStatus;
  appliedAlternative: number | null;
  clusterIds: string[];
  createdAt: string;
  decidedAt: string | null;
}

export interface NewClusterProposal extends ProposalDecision, ProposedCluster {
  alternatives: ProposalAlternative[];
}

export interface AdditionProposal extends ProposalDecision {
  existingClusterId: string;
  existingClusterName: string;
  ticker: string;
  reason: string;
  source: string | null;
}

export interface UnclusteredHit {
  ticker: string;
  reason: string;
}

export interface ScanProposals {
  scanDate: string;
  run: {
    model: string;
    finishedAt: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    dropped: string[];
  } | null;
  newClusters: NewClusterProposal[];
  additions: AdditionProposal[];
  unclustered: UnclusteredHit[];
}

export interface ProposalEdit {
  name?: string;
  description?: string;
  addTickers?: string[];
  removeTickers?: string[];
}

export type AcceptProposalRequest =
  | Record<string, never>
  | { edit: ProposalEdit }
  | { alternativeIndex: number };

export class PotentScanClient {
  async listScanDates(): Promise<string[]> {
    const response = await apiClient.get<{ scanDates: string[] }>(
      "/potent-scan/scans",
    );
    return response.data.scanDates;
  }

  async getScan(scanDate: string): Promise<PotentScan> {
    const response = await apiClient.get<PotentScan>(
      `/potent-scan/scans/${scanDate}`,
    );
    return response.data;
  }

  async listClusters(status: ClusterStatus): Promise<Cluster[]> {
    const response = await apiClient.get<{ clusters: Cluster[] }>(
      "/potent-scan/clusters",
      { params: { status } },
    );
    return response.data.clusters;
  }

  async createCluster(
    request: CreateClusterRequest,
  ): Promise<{ clusterId: string }> {
    const response = await apiClient.post<
      { clusterId: string },
      CreateClusterRequest
    >("/potent-scan/clusters", request);
    return response.data;
  }

  async getCluster(clusterId: string): Promise<ClusterDetail> {
    const response = await apiClient.get<ClusterDetail>(
      `/potent-scan/clusters/${encodeURIComponent(clusterId)}`,
    );
    return response.data;
  }

  async updateCluster(
    clusterId: string,
    request: UpdateClusterRequest,
  ): Promise<void> {
    await apiClient.patch<void, UpdateClusterRequest>(
      `/potent-scan/clusters/${encodeURIComponent(clusterId)}`,
      request,
    );
  }

  async addMember(clusterId: string, ticker: string): Promise<void> {
    await apiClient.post<void, { ticker: string }>(
      `/potent-scan/clusters/${encodeURIComponent(clusterId)}/members`,
      { ticker },
    );
  }

  async removeMember(clusterId: string, ticker: string): Promise<void> {
    await apiClient.delete<void>(
      `/potent-scan/clusters/${encodeURIComponent(clusterId)}/members/${encodeURIComponent(ticker)}`,
    );
  }

  async closeCluster(clusterId: string): Promise<void> {
    await apiClient.post(
      `/potent-scan/clusters/${encodeURIComponent(clusterId)}/close`,
    );
  }

  async getProposals(scanDate: string): Promise<ScanProposals> {
    const response = await apiClient.get<ScanProposals>(
      `/potent-scan/scans/${scanDate}/proposals`,
    );
    return response.data;
  }

  async acceptProposal(
    proposalId: string,
    request: AcceptProposalRequest,
  ): Promise<{ clusterIds: string[] }> {
    const response = await apiClient.post<
      { clusterIds: string[] },
      AcceptProposalRequest
    >(
      `/potent-scan/proposals/${encodeURIComponent(proposalId)}/accept`,
      request,
    );
    return response.data;
  }

  async rejectProposal(proposalId: string): Promise<void> {
    await apiClient.post(
      `/potent-scan/proposals/${encodeURIComponent(proposalId)}/reject`,
    );
  }
}
