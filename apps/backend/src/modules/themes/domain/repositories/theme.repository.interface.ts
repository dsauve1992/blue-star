import { ThemeEntity } from '../entities/theme.entity';
import { ThemeTickerEntity } from '../entities/theme-ticker.entity';

export interface ThemeRepository {
  saveTheme(theme: ThemeEntity): Promise<void>;
  findThemeByName(name: string): Promise<ThemeEntity | null>;
  findAllThemes(): Promise<ThemeEntity[]>;
  replaceThemeTickers(
    themeId: string,
    tickers: ThemeTickerEntity[],
  ): Promise<void>;
  findTickersByThemeId(themeId: string): Promise<ThemeTickerEntity[]>;
  findThemesByTickers(tickers: string[]): Promise<Map<string, ThemeEntity[]>>;
}
