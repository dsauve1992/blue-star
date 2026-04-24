import { LeaderScanRun } from '../entities/leader-scan-run';
import { LeaderScanResult } from '../entities/leader-scan-result';
import { ScanDate } from '../value-objects/scan-date';

export interface LeaderScanRepository {
  saveRun(run: LeaderScanRun): Promise<void>;
  saveResults(run: LeaderScanRun, results: LeaderScanResult[]): Promise<void>;
  getLatestResults(): Promise<LeaderScanResult[]>;
  getResultsForDate(scanDate: ScanDate): Promise<LeaderScanResult[]>;
  getLatestResultForSymbol(symbol: string): Promise<LeaderScanResult | null>;
}
