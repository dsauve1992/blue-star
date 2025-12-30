import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ThemeService } from '../../domain/services/theme.service';
import { THEME_SERVICE } from '../../constants/tokens';

@Injectable()
export class ThemeCronService {
  private readonly logger = new Logger(ThemeCronService.name);

  constructor(
    @Inject(THEME_SERVICE)
    private readonly themeService: ThemeService,
  ) {}

  @Cron('0 2 * * 1')
  async runWeeklyThemeExtraction() {
    this.logger.log('Starting weekly theme extraction...');
    try {
      await this.themeService.extractAndSaveThemes();
      this.logger.log('Weekly theme extraction completed successfully');
    } catch (error) {
      this.logger.error(
        `Weekly theme extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
