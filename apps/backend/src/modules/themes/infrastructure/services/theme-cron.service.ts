import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ThemeService } from '../../domain/services/theme.service';
import { THEME_SERVICE } from '../../constants/tokens';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class ThemeCronService {
  private readonly logger = new Logger(ThemeCronService.name);

  constructor(
    @Inject(THEME_SERVICE)
    private readonly themeService: ThemeService,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('0 17 * * 1-5')
  async runWeeklyThemeExtraction() {
    const jobName = 'Weekly Theme Extraction';
    this.logger.log(`Starting ${jobName}...`);

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'themes',
      frequency: 'weekly',
    });

    try {
      await this.themeService.extractAndSaveThemes();
      this.logger.log('Weekly theme extraction completed successfully');

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'themes',
        frequency: 'weekly',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Weekly theme extraction failed: ${errorMessage}`);

      await this.cronJobNotificationService.notifyJobError(
        {
          jobName,
          jobType: 'themes',
          frequency: 'weekly',
        },
        error,
      );
    }
  }
}
