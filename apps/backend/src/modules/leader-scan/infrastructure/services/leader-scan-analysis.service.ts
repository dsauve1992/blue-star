import { Inject, Injectable, Logger } from '@nestjs/common';
import { LeaderScanAnalysisService } from '../../domain/services/leader-scan-analysis.service';
import { LeaderScanScreenerService } from '../../domain/services/leader-scan-screener.service';
import { LeaderScanRepository } from '../../domain/repositories/leader-scan.repository.interface';
import { LeaderScanRun } from '../../domain/entities/leader-scan-run';
import { LeaderScanResult } from '../../domain/entities/leader-scan-result';
import { ScanDate } from '../../domain/value-objects/scan-date';
import { RsScore } from '../../domain/value-objects/rs-score';
import {
  LEADER_SCAN_REPOSITORY,
  LEADER_SCAN_SCREENER_SERVICE,
} from '../../constants/tokens';

@Injectable()
export class LeaderScanAnalysisServiceImpl
  implements LeaderScanAnalysisService
{
  private readonly logger = new Logger(LeaderScanAnalysisServiceImpl.name);

  constructor(
    @Inject(LEADER_SCAN_SCREENER_SERVICE)
    private readonly screener: LeaderScanScreenerService,
    @Inject(LEADER_SCAN_REPOSITORY)
    private readonly repository: LeaderScanRepository,
  ) {}

  async runAnalysis(scanDate: ScanDate): Promise<LeaderScanRun> {
    const run = LeaderScanRun.create(scanDate);
    await this.repository.saveRun(run);

    try {
      const payload = await this.screener.runScan();

      const results: LeaderScanResult[] = payload.results.map((raw) =>
        LeaderScanResult.create({
          symbol: raw.ticker,
          scanDate,
          exchange: raw.exchange,
          sector: raw.sector,
          perf1M: raw.perf_1m,
          perf3M: raw.perf_3m,
          perf6M: raw.perf_6m,
          rank1M: raw.rank_1m,
          rank3M: raw.rank_3m,
          rank6M: raw.rank_6m,
          rsScore: RsScore.of(raw.rs_score),
          adr20: raw.adr_20,
          dollarVolume20: raw.dollar_volume_20,
          top1MFlag: raw.top_1m_flag,
          top3MFlag: raw.top_3m_flag,
          top6MFlag: raw.top_6m_flag,
          smallSizeFlag: raw.small_size_flag,
        }),
      );

      run.markCompleted(payload.universe_size, payload.leader_count);
      await this.repository.saveResults(run, results);
      await this.repository.saveRun(run);

      this.logger.log(
        `Leader scan completed for ${scanDate.toISOString()}: ${results.length} leaders from ${payload.universe_size} filtered universe`,
      );

      return run;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      run.markFailed(msg);
      await this.repository.saveRun(run);
      throw error;
    }
  }
}
