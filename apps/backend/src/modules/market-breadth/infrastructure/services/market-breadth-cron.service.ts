import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketBreadthAnalysisService } from '../../domain/services/market-breadth-analysis.service';
import { MARKET_BREADTH_ANALYSIS_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class MarketBreadthCronService {
  private readonly logger = new Logger(MarketBreadthCronService.name);

  constructor(
    @Inject(MARKET_BREADTH_ANALYSIS_SERVICE)
    private readonly analysisService: MarketBreadthAnalysisService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 20 * * 1-5', { timeZone: 'America/Toronto' })
  async runDailyBreadth(): Promise<void> {
    const jobName = 'Market Breadth NH/NL';
    this.logger.log(`Starting ${jobName}`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'market-breadth',
      frequency: 'daily',
    });

    try {
      const result = await this.analysisService.runDaily();
      const latest = result.aggregates[result.aggregates.length - 1];

      this.logger.log(
        `${jobName} completed: ${result.sessionsRecomputed.length} sessions recomputed, latest ${latest?.date.toISOString()} NH=${latest?.newHighs} NL=${latest?.newLows}`,
      );

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'market-breadth',
        frequency: 'daily',
        additionalData: latest
          ? `NH=${latest.newHighs} NL=${latest.newLows} universe=${latest.universeSize}`
          : 'no sessions recomputed',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${msg}`);
      await this.cronJobNotificationService.notifyJobError(
        { jobName, jobType: 'market-breadth', frequency: 'daily' },
        error,
      );
    }
  }
}
