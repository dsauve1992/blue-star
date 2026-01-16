import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConsolidationAnalysisService } from '../../domain/services/consolidation-analysis.service';
import { AnalysisDate } from '../../domain/value-objects/analysis-date';
import { CONSOLIDATION_ANALYSIS_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class ConsolidationCronService {
  private readonly logger = new Logger(ConsolidationCronService.name);

  constructor(
    @Inject(CONSOLIDATION_ANALYSIS_SERVICE)
    private readonly analysisService: ConsolidationAnalysisService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 17 * * 1-5')
  async runDailyAnalysis() {
    const jobName = 'Daily Consolidation Analysis';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'consolidation',
      frequency: 'daily',
    });

    try {
      const analysisDate = AnalysisDate.today();
      await this.analysisService.runAnalysis('daily', analysisDate);
      this.logger.log(
        `Daily consolidation analysis completed for ${analysisDate.toISOString()}`,
      );

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'consolidation',
        frequency: 'daily',
        additionalData: analysisDate.toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Daily consolidation analysis failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'consolidation',
          frequency: 'daily',
        },
        error,
      );
    }
  }

  @Cron('0 17 * * 5')
  async runWeeklyAnalysis() {
    const jobName = 'Weekly Consolidation Analysis';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'consolidation',
      frequency: 'weekly',
    });

    try {
      const today = new Date();
      const analysisDate = AnalysisDate.forWeekly(today);
      await this.analysisService.runAnalysis('weekly', analysisDate);
      this.logger.log(
        `Weekly consolidation analysis completed for ${analysisDate.toISOString()}`,
      );

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'consolidation',
        frequency: 'weekly',
        additionalData: analysisDate.toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Weekly consolidation analysis failed: ${errorMessage}`,
      );

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'consolidation',
          frequency: 'weekly',
        },
        error,
      );
    }
  }
}
