import { Inject, Injectable, Logger } from '@nestjs/common';
import { ThemeRepository } from '../../domain/repositories/theme.repository.interface';
import { ThemeService } from '../../domain/services/theme.service';
import { ThemeEntity } from '../../domain/entities/theme.entity';
import { ThemeTickerEntity } from '../../domain/entities/theme-ticker.entity';
import { PythonThemeExtractorService } from './python-theme-extractor.service';
import {
  THEME_REPOSITORY,
  THEME_EXTRACTOR_SERVICE,
} from '../../constants/tokens';
import { randomUUID } from 'crypto';

@Injectable()
export class ThemeServiceImpl implements ThemeService {
  private readonly logger = new Logger(ThemeServiceImpl.name);

  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
    @Inject(THEME_EXTRACTOR_SERVICE)
    private readonly pythonExtractor: PythonThemeExtractorService,
  ) {}

  async extractAndSaveThemes(): Promise<void> {
    this.logger.log('Starting theme extraction...');

    try {
      const themesData = await this.pythonExtractor.extractThemes();
      this.logger.log(`Extracted ${themesData.length} themes`);

      for (const themeData of themesData) {
        let theme = await this.themeRepository.findThemeByName(themeData.theme);

        if (!theme) {
          const themeId = randomUUID();
          const now = new Date();
          theme = ThemeEntity.of({
            id: themeId,
            name: themeData.theme,
            createdAt: now,
            updatedAt: now,
          });
          await this.themeRepository.saveTheme(theme);
          this.logger.log(`Created new theme: ${themeData.theme}`);
        } else {
          const updatedTheme = ThemeEntity.of({
            id: theme.id,
            name: theme.name,
            createdAt: theme.createdAt,
            updatedAt: new Date(),
          });
          await this.themeRepository.saveTheme(updatedTheme);
        }

        await this.themeRepository.deleteAllThemeTickers(theme.id);

        const tickerEntities = themeData.tickers.map((ticker) =>
          ThemeTickerEntity.of({
            id: randomUUID(),
            themeId: theme.id,
            ticker: ticker.toUpperCase(),
            createdAt: new Date(),
          }),
        );

        await this.themeRepository.saveThemeTickers(theme.id, tickerEntities);
        this.logger.log(
          `Saved ${tickerEntities.length} tickers for theme: ${themeData.theme}`,
        );
      }

      this.logger.log('Theme extraction completed successfully');
    } catch (error) {
      this.logger.error(
        `Theme extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
