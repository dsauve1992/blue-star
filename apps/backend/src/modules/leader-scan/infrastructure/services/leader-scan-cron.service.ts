import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaderScanAnalysisService } from '../../domain/services/leader-scan-analysis.service';
import { ScanDate } from '../../domain/value-objects/scan-date';
import { LEADER_SCAN_ANALYSIS_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class LeaderScanCronService {
  private readonly logger = new Logger(LeaderScanCronService.name);

  constructor(
    @Inject(LEADER_SCAN_ANALYSIS_SERVICE)
    private readonly analysisService: LeaderScanAnalysisService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('30 19 * * 5', { timeZone: 'America/New_York' })
  async runWeeklyScan(): Promise<void> {
    const jobName = 'Weekly Leader Scan';
    this.logger.log(`Starting ${jobName}`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'leader-scan',
      frequency: 'weekly',
    });

    try {
      const scanDate = ScanDate.today();
      const run = await this.analysisService.runAnalysis(scanDate);

      this.logger.log(
        `${jobName} completed: ${run.leaderCount} leaders from ${run.universeSize} filtered universe`,
      );

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'leader-scan',
        frequency: 'weekly',
        additionalData: `${run.leaderCount} leaders / ${run.universeSize} universe`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${msg}`);
      await this.cronJobNotificationService.notifyJobError(
        { jobName, jobType: 'leader-scan', frequency: 'weekly' },
        error,
      );
    }
  }
}
