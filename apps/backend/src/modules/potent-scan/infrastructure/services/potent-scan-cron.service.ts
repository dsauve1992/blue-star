import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { ResearchPotentHitsUseCase } from '../../use-cases/research-potent-hits.use-case';
import { SessionDate } from '../../domain/value-objects/session-date';
import { TrackMemberTiersUseCase } from '../../use-cases/track-member-tiers.use-case';
import { ProposeClustersUseCase } from '../../use-cases/propose-clusters.use-case';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { MARKET_TIMEZONE } from '../../../../shared/utils/market-clock';

@Injectable()
export class PotentScanCronService {
  private readonly logger = new Logger(PotentScanCronService.name);

  constructor(
    private readonly runPotentScanUseCase: RunPotentScanUseCase,
    private readonly trackMemberTiersUseCase: TrackMemberTiersUseCase,
    private readonly cronJobNotificationService: CronJobNotificationService,
    private readonly researchPotentHitsUseCase: ResearchPotentHitsUseCase,
    private readonly proposeClustersUseCase: ProposeClustersUseCase,
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

    if (await this.researchHits(scannedSession)) {
      await this.proposeClusters(scannedSession);
    }
  }

  private async researchHits(sessionDate: SessionDate): Promise<boolean> {
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
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent hit research failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(job, error);
      return false;
    }
  }

  private async proposeClusters(sessionDate: SessionDate) {
    const job = {
      jobName: 'Potent Cluster Proposals',
      jobType: 'potent-cluster-proposals',
      frequency: 'daily',
    };
    await this.cronJobNotificationService.notifyJobStart(job);

    try {
      const { newClusterCount, additionCount, droppedCount, usage } =
        await this.proposeClustersUseCase.execute({ sessionDate });
      await this.cronJobNotificationService.notifyJobSuccess({
        ...job,
        additionalData:
          `${newClusterCount} clusters and ${additionCount} additions proposed ` +
          `(${droppedCount} dropped) for $${usage.costUsd.toFixed(4)}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Potent cluster proposals failed: ${errorMessage}`);

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
