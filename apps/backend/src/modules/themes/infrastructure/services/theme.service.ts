import { Inject, Injectable, Logger } from '@nestjs/common';
import { ThemeRepository } from '../../domain/repositories/theme.repository.interface';
import {
  ThemeExtractionSummary,
  ThemeService,
} from '../../domain/services/theme.service';
import { ThemeEntity } from '../../domain/entities/theme.entity';
import { ThemeTickerEntity } from '../../domain/entities/theme-ticker.entity';
import { PythonThemeExtractorService } from './python-theme-extractor.service';
import {
  THEME_REPOSITORY,
  THEME_EXTRACTOR_SERVICE,
} from '../../constants/tokens';
import { randomUUID } from 'crypto';

const STALE_THEME_RETENTION_DAYS = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ThemeServiceImpl implements ThemeService {
  private readonly logger = new Logger(ThemeServiceImpl.name);

  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
    @Inject(THEME_EXTRACTOR_SERVICE)
    private readonly pythonExtractor: PythonThemeExtractorService,
  ) {}

  async extractAndSaveThemes(): Promise<ThemeExtractionSummary> {
    this.logger.log('Starting theme extraction...');

    try {
      const themesData = await this.pythonExtractor.extractThemes();
      this.logger.log(`Extracted ${themesData.length} themes`);

      let refreshed = 0;
      const skipped: string[] = [];

      for (const themeData of themesData) {
        if (themeData.tickers.length === 0) {
          skipped.push(themeData.theme);
          this.logger.warn(
            `Skipping theme with no tickers: ${themeData.theme}`,
          );
          continue;
        }

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

        const tickerEntities = themeData.tickers.map((ticker) =>
          ThemeTickerEntity.of({
            id: randomUUID(),
            themeId: theme.id,
            ticker: ticker.toUpperCase(),
            createdAt: new Date(),
          }),
        );

        await this.themeRepository.replaceThemeTickers(
          theme.id,
          tickerEntities,
        );
        refreshed++;
        this.logger.log(
          `Saved ${tickerEntities.length} tickers for theme: ${themeData.theme}`,
        );
      }

      if (refreshed === 0) {
        throw new Error(
          `No themes refreshed: all ${themesData.length} came back with no tickers`,
        );
      }

      const cutoff = new Date(
        Date.now() - STALE_THEME_RETENTION_DAYS * MS_PER_DAY,
      );
      const pruned =
        await this.themeRepository.deleteThemesNotUpdatedSince(cutoff);
      this.logger.log(`Pruned ${pruned} stale themes`);

      this.logger.log('Theme extraction completed successfully');
      return { refreshed, skipped };
    } catch (error) {
      this.logger.error(
        `Theme extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
