import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthAnalysisService } from '../domain/services/market-breadth-analysis.service';
import { MARKET_BREADTH_ANALYSIS_SERVICE } from '../constants/tokens';

export interface RunMarketBreadthResponseDto {
  scanDate: string;
  fetchedUniverseSize: number;
  sessionsRecomputed: string[];
}

@Injectable()
export class RunMarketBreadthUseCase {
  constructor(
    @Inject(MARKET_BREADTH_ANALYSIS_SERVICE)
    private readonly analysisService: MarketBreadthAnalysisService,
  ) {}

  async execute(): Promise<RunMarketBreadthResponseDto> {
    const result = await this.analysisService.runDaily();
    return {
      scanDate: result.scanDate,
      fetchedUniverseSize: result.universeSize,
      sessionsRecomputed: result.sessionsRecomputed,
    };
  }
}
