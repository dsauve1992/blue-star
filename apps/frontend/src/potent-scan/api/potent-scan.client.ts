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
  removedAt: string | null;
}

export type ClusterStatus = "tracking" | "closed";

export interface Cluster {
  id: string;
  name: string;
  description: string;
  sourceScanDate: string;
  createdAt: string;
  status: ClusterStatus;
  members: ClusterMember[];
}

export interface CreateClusterRequest {
  name: string;
  description: string;
  tickers: string[];
  sourceScanDate: string;
}

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
}
