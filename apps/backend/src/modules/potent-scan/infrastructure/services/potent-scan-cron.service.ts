import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { ResearchPotentHitsUseCase } from '../../use-cases/research-potent-hits.use-case';
import { SessionDate } from '../../domain/value-objects/session-date';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

@Injectable()
export class PotentScanCronService {
  private readonly logger = new Logger(PotentScanCronService.name);

  constructor(
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly cronJobNotificationService: CronJobNotificationService,
    private readonly researchPotentHitsUseCase: ResearchPotentHitsUseCase,
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

    let scannedSession: SessionDate;
    try {
      const { sessionDate, hitCount } = await this.runPotentScanUseCase.execute(
        { replaceExisting: false },
      );
      this.logger.log(
        `Potent scan completed for ${sessionDate.value} with ${hitCount} hits`,
      );

      await this.cronJobNotificationService.notifyJobSuccess(job);
      scannedSession = sessionDate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent scan failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(job, error);
      return;
    }

    await this.researchHits(scannedSession);
  }

  private async researchHits(sessionDate: SessionDate) {
    const job = {
      jobName: 'Potent Hit Research',
      jobType: 'potent-hit-research',
      frequency: 'daily',
    };
    await this.cronJobNotificationService.notifyJobStart(job);

    try {
      const { researchedCount, usage } =
        await this.researchPotentHitsUseCase.execute({ sessionDate });
      await this.cronJobNotificationService.notifyJobSuccess({
        ...job,
        additionalData: `${researchedCount} hits researched for $${usage.costUsd.toFixed(4)}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent hit research failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(job, error);
    }
  }
}
