import { apiClient } from "../../global/api/api-instance";

export interface MomentumLeader {
  symbol: string;
  exchange: string;
  sector: string | null;
  perf1M: number;
  perf3M: number;
  perf6M: number;
  rsScore: number;
  top1M: boolean;
  top3M: boolean;
  top6M: boolean;
  consolidatingDaily: boolean;
  consolidatingWeekly: boolean;
  themes: string[];
  industryGroup: string | null;
}

export interface MomentumLeadersResponse {
  scanDate: string | null;
  universeSize: number;
  count: number;
  consolidatingCount: number;
  leaders: MomentumLeader[];
}

export function leaderTickerFullName(leader: MomentumLeader): string {
  return `${leader.exchange}:${leader.symbol}`;
}

export class MomentumLeadersClient {
  async getLatest(): Promise<MomentumLeadersResponse> {
    const response = await apiClient.get<MomentumLeadersResponse>(
      "/stock-analysis/momentum-leaders",
    );
    return response.data;
  }

  async run(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }, undefined>(
      "/stock-analysis/momentum-leaders/run",
      undefined,
      { timeout: 600000 },
    );
    return response.data;
  }
}
