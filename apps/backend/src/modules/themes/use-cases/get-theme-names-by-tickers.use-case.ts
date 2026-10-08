import { Inject, Injectable } from '@nestjs/common';
import { THEME_REPOSITORY } from '../constants/tokens';
import type { ThemeRepository } from '../domain/repositories/theme.repository.interface';

@Injectable()
export class GetThemeNamesByTickersUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(tickers: string[]): Promise<Map<string, string[]>> {
    const themesByTicker =
      await this.themeRepository.findThemesByTickers(tickers);
    return new Map(
      [...themesByTicker].map(([ticker, themes]) => [
        ticker,
        themes.map((theme) => theme.name),
      ]),
    );
  }
}
