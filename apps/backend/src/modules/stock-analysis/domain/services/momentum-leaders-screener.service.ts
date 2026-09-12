export interface MomentumLeaderResult {
  symbol: string;
  exchange: string;
  sector: string | null;
  perf1M: number;
  perf3M: number;
  perf6M: number;
  adrPct: number;
  rank1M: number;
  rank3M: number;
  rank6M: number;
  rsScore: number;
  top1M: boolean;
  top3M: boolean;
  top6M: boolean;
}

export interface MomentumLeadersScan {
  scanDate: string;
  universeSize: number;
  leaders: MomentumLeaderResult[];
}

export interface MomentumLeadersScreenerService {
  fetchMomentumLeaders(): Promise<MomentumLeadersScan>;
}
