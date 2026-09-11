import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MomentumLeadersComputationService } from '../../domain/services/momentum-leaders-computation.service';
import { MOMENTUM_LEADERS_COMPUTATION_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class MomentumLeadersCronService {
  private readonly logger = new Logger(MomentumLeadersCronService.name);

  constructor(
    @Inject(MOMENTUM_LEADERS_COMPUTATION_SERVICE)
    private readonly computationService: MomentumLeadersComputationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('45 17 * * 1-5', { timeZone: 'America/Toronto' })
  async runDailyScan() {
    const jobName = 'Daily Momentum Leaders Scan';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'momentum-leaders',
      frequency: 'daily',
    });

    try {
      await this.computationService.computeMomentumLeaders();
      this.logger.log('Momentum leaders scan completed');

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'momentum-leaders',
        frequency: 'daily',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Momentum leaders scan failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        { jobName, jobType: 'momentum-leaders', frequency: 'daily' },
        error,
      );
    }
  }
}
