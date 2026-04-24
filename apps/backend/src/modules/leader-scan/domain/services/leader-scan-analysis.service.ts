import { LeaderScanRun } from '../entities/leader-scan-run';
import { ScanDate } from '../value-objects/scan-date';

export interface LeaderScanAnalysisService {
  runAnalysis(scanDate: ScanDate): Promise<LeaderScanRun>;
}
