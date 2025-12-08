import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConsolidationAnalysisService } from '../../domain/services/consolidation-analysis.service';
import { AnalysisDate } from '../../domain/value-objects/analysis-date';
import { CONSOLIDATION_ANALYSIS_SERVICE } from '../../constants/tokens';

@Injectable()
export class ConsolidationCronService {
  private readonly logger = new Logger(ConsolidationCronService.name);

  constructor(
    @Inject(CONSOLIDATION_ANALYSIS_SERVICE)
    private readonly analysisService: ConsolidationAnalysisService,
  ) {}

  @Cron('0 17 * * 1-5')
  async runDailyAnalysis() {
    this.logger.log('Starting daily consolidation analysis...');
    try {
      const analysisDate = AnalysisDate.today();
      await this.analysisService.runAnalysis('daily', analysisDate);
      this.logger.log(
        `Daily consolidation analysis completed for ${analysisDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Daily consolidation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Cron('0 17 * * 5')
  async runWeeklyAnalysis() {
    this.logger.log('Starting weekly consolidation analysis...');
    try {
      const today = new Date();
      const analysisDate = AnalysisDate.forWeekly(today);
      await this.analysisService.runAnalysis('weekly', analysisDate);
      this.logger.log(
        `Weekly consolidation analysis completed for ${analysisDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Weekly consolidation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
