import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { ThemeRepository } from '../../domain/repositories/theme.repository.interface';
import { ThemeEntity } from '../../domain/entities/theme.entity';
import { ThemeTickerEntity } from '../../domain/entities/theme-ticker.entity';

interface ThemeRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ThemeTickerRow {
  id: string;
  theme_id: string;
  ticker: string;
  created_at: string;
}

@Injectable()
export class ThemeRepositoryImpl implements ThemeRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async saveTheme(theme: ThemeEntity): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO themes (id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
       updated_at = EXCLUDED.updated_at`,
      [theme.id, theme.name, theme.createdAt, theme.updatedAt],
    );
  }

  async findThemeByName(name: string): Promise<ThemeEntity | null> {
    const result = (await this.databaseService.query(
      `SELECT id, name, created_at, updated_at
       FROM themes
       WHERE name = $1`,
      [name],
    )) as { rows: ThemeRow[] };

    if (result.rows.length === 0) {
      return null;
    }

    return ThemeEntity.fromData(result.rows[0]);
  }

  async findAllThemes(): Promise<ThemeEntity[]> {
    const result = (await this.databaseService.query(
      `SELECT id, name, created_at, updated_at
       FROM themes
       ORDER BY name`,
    )) as { rows: ThemeRow[] };

    return result.rows.map((row) => ThemeEntity.fromData(row));
  }

  async saveThemeTickers(
    themeId: string,
    tickers: ThemeTickerEntity[],
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      for (const ticker of tickers) {
        await client.query(
          `INSERT INTO theme_tickers (id, theme_id, ticker, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (theme_id, ticker) DO NOTHING`,
          [ticker.id, themeId, ticker.ticker, ticker.createdAt],
        );
      }
    });
  }

  async findTickersByThemeId(themeId: string): Promise<ThemeTickerEntity[]> {
    const result = (await this.databaseService.query(
      `SELECT id, theme_id, ticker, created_at
       FROM theme_tickers
       WHERE theme_id = $1
       ORDER BY ticker`,
      [themeId],
    )) as { rows: ThemeTickerRow[] };

    return result.rows.map((row) => ThemeTickerEntity.fromData(row));
  }

  async deleteAllThemeTickers(themeId: string): Promise<void> {
    await this.databaseService.query(
      `DELETE FROM theme_tickers WHERE theme_id = $1`,
      [themeId],
    );
  }
}

