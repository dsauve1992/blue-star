import { Inject, Injectable } from '@nestjs/common';
import { LeaderScanAnalysisService } from '../domain/services/leader-scan-analysis.service';
import { ScanDate } from '../domain/value-objects/scan-date';
import { LEADER_SCAN_ANALYSIS_SERVICE } from '../constants/tokens';

export interface RunLeaderScanResponseDto {
  scanDate: string;
  universeSize: number;
  leaderCount: number;
  status: string;
}

@Injectable()
export class RunLeaderScanUseCase {
  constructor(
    @Inject(LEADER_SCAN_ANALYSIS_SERVICE)
    private readonly analysisService: LeaderScanAnalysisService,
  ) {}

  async execute(): Promise<RunLeaderScanResponseDto> {
    const run = await this.analysisService.runAnalysis(ScanDate.today());
    return {
      scanDate: run.scanDate.toISOString(),
      universeSize: run.universeSize ?? 0,
      leaderCount: run.leaderCount ?? 0,
      status: run.status,
    };
  }
}
