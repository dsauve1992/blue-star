import { ThemeEntity } from '../entities/theme.entity';
import { ThemeTickerEntity } from '../entities/theme-ticker.entity';

export interface ThemeRepository {
  saveTheme(theme: ThemeEntity): Promise<void>;
  findThemeByName(name: string): Promise<ThemeEntity | null>;
  findAllThemes(): Promise<ThemeEntity[]>;
  saveThemeTickers(
    themeId: string,
    tickers: ThemeTickerEntity[],
  ): Promise<void>;
  findTickersByThemeId(themeId: string): Promise<ThemeTickerEntity[]>;
  deleteAllThemeTickers(themeId: string): Promise<void>;
  findThemesByTicker(ticker: string): Promise<ThemeEntity[]>;
}
