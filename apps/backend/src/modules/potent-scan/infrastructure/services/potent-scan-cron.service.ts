import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

@Injectable()
export class PotentScanCronService {
  private readonly logger = new Logger(PotentScanCronService.name);

  constructor(
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('50 17 * * 1-5', { timeZone: MARKET_TIMEZONE })
  async runDailyScan() {
    const job = {
      jobName: 'Daily Potent Scan',
      jobType: 'potent-scan',
      frequency: 'daily',
    };
    this.logger.log(`Starting ${job.jobName}...`);

    await this.cronJobNotificationService.notifyJobStart(job);

    try {
      const { sessionDate, hitCount } = await this.runPotentScanUseCase.execute(
        { replaceExisting: false },
      );
      this.logger.log(
        `Potent scan completed for ${sessionDate.value} with ${hitCount} hits`,
      );

      await this.cronJobNotificationService.notifyJobSuccess(job);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent scan failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(job, error);
    }
  }
}
