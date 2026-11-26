import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { TrackMemberTiersUseCase } from '../../use-cases/track-member-tiers.use-case';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

@Injectable()
export class PotentScanCronService {
  private readonly logger = new Logger(PotentScanCronService.name);

  constructor(
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly trackMemberTiersUseCase: TrackMemberTiersUseCase,
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

  @Cron('10 18 * * 1-5', { timeZone: MARKET_TIMEZONE })
  async trackMemberTiers() {
    const job = {
      jobName: 'Daily Potent Member Tiers',
      jobType: 'potent-member-tiers',
      frequency: 'daily',
    };
    this.logger.log(`Starting ${job.jobName}...`);

    await this.cronJobNotificationService.notifyJobStart(job);

    try {
      const { sessionDate, tierCount, failures } =
        await this.trackMemberTiersUseCase.execute();
      if (failures.length > 0) {
        throw new Error(
          `Member tiers for ${sessionDate.value} failed for ${failures.length} ticker(s): ${failures.join('; ')}`,
        );
      }
      this.logger.log(
        `Member tiers tracked for ${sessionDate.value}: ${tierCount} rows`,
      );

      await this.cronJobNotificationService.notifyJobSuccess(job);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Member tier tracking failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(job, error);
    }
  }
}
