export interface LeaderScanRawResult {
  ticker: string;
  exchange: string;
  sector: string;
  perf_1m: number;
  perf_3m: number;
  perf_6m: number;
  rank_1m: number;
  rank_3m: number;
  rank_6m: number;
  rs_score: number;
  adr_20: number;
  dollar_volume_20: number;
  top_1m_flag: boolean;
  top_3m_flag: boolean;
  top_6m_flag: boolean;
  small_size_flag: boolean;
}

export interface LeaderScanPayload {
  scan_date: string;
  universe_size: number;
  leader_count: number;
  results: LeaderScanRawResult[];
}

export interface LeaderScanScreenerService {
  runScan(): Promise<LeaderScanPayload>;
}
