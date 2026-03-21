import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RsRatingComputationService } from '../../domain/services/rs-rating-computation.service';
import { RS_RATING_COMPUTATION_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class RsRatingCronService {
  private readonly logger = new Logger(RsRatingCronService.name);

  constructor(
    @Inject(RS_RATING_COMPUTATION_SERVICE)
    private readonly computationService: RsRatingComputationService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 18 * * 5', { timeZone: 'America/Toronto' })
  async runWeeklyRsRatings() {
    const jobName = 'Weekly RS Rating Computation';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'rs-rating',
      frequency: 'weekly',
    });

    try {
      await this.computationService.computeRsRatings();
      this.logger.log('RS rating computation completed');

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'rs-rating',
        frequency: 'weekly',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`RS rating computation failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'rs-rating',
          frequency: 'weekly',
        },
        error,
      );
    }
  }
}
