import { LeaderScanRun } from '../entities/leader-scan-run';
import { LeaderScanResult } from '../entities/leader-scan-result';
import { ScanDate } from '../value-objects/scan-date';
import { BreadthRunSample } from '../services/leader-breadth.service';

export interface LeaderScanRepository {
  saveRun(run: LeaderScanRun): Promise<void>;
  saveResults(run: LeaderScanRun, results: LeaderScanResult[]): Promise<void>;
  getLatestResults(): Promise<LeaderScanResult[]>;
  getResultsForDate(scanDate: ScanDate): Promise<LeaderScanResult[]>;
  getLatestResultForSymbol(symbol: string): Promise<LeaderScanResult | null>;
  /**
   * The most recent completed runs (newest first), capped at `limit`, for
   * computing the breadth-trend gauge. Only runs with a usable leader count
   * and universe size are returned.
   */
  getRecentCompletedRuns(limit: number): Promise<BreadthRunSample[]>;
}
