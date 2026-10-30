import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthAnalysisService } from '../domain/services/market-breadth-analysis.service';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import {
  MARKET_BREADTH_ANALYSIS_SERVICE,
  MARKET_BREADTH_REPOSITORY,
} from '../constants/tokens';

export interface BackfillMarketBreadthCommand {
  sessions?: number;
  flush: boolean;
}

export interface BackfillMarketBreadthResponseDto {
  fetchedUniverseSize: number;
  sessionsRecomputed: string[];
}

@Injectable()
export class BackfillMarketBreadthUseCase {
  constructor(
    @Inject(MARKET_BREADTH_ANALYSIS_SERVICE)
    private readonly analysisService: MarketBreadthAnalysisService,
    @Inject(MARKET_BREADTH_REPOSITORY)
    private readonly repository: MarketBreadthRepository,
  ) {}

  async execute(
    command: BackfillMarketBreadthCommand,
  ): Promise<BackfillMarketBreadthResponseDto> {
    if (command.flush) {
      await this.repository.deleteAll();
    }
    const result = await this.analysisService.runBackfill(command.sessions);
    return {
      fetchedUniverseSize: result.universeSize,
      sessionsRecomputed: result.sessionsRecomputed,
    };
  }
}
