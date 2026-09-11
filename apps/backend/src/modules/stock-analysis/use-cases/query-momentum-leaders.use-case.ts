import { Inject, Injectable } from '@nestjs/common';
import { MomentumLeaderRepository } from '../domain/repositories/momentum-leader.repository.interface';
import { ConsolidationResultRepository } from '../domain/repositories/consolidation-result.repository.interface';
import {
  CONSOLIDATION_RESULT_REPOSITORY,
  MOMENTUM_LEADER_REPOSITORY,
} from '../constants/tokens';
import { ThemeRepository } from '../../themes/domain/repositories/theme.repository.interface';
import { THEME_REPOSITORY } from '../../themes/constants/tokens';
import { GetOrFetchStockClassificationUseCase } from '../../stock-classification/use-cases/get-or-fetch-stock-classification.use-case';

export interface MomentumLeaderDto {
  symbol: string;
  exchange: string;
  sector: string | null;
  perf1M: number;
  perf3M: number;
  perf6M: number;
  rsScore: number;
  top1M: boolean;
  top3M: boolean;
  top6M: boolean;
  consolidatingDaily: boolean;
  consolidatingWeekly: boolean;
  themes: string[];
  industryGroup: string | null;
}

export interface QueryMomentumLeadersResponseDto {
  scanDate: string | null;
  universeSize: number;
  count: number;
  consolidatingCount: number;
  leaders: MomentumLeaderDto[];
}

@Injectable()
export class QueryMomentumLeadersUseCase {
  constructor(
    @Inject(MOMENTUM_LEADER_REPOSITORY)
    private readonly repository: MomentumLeaderRepository,
    @Inject(CONSOLIDATION_RESULT_REPOSITORY)
    private readonly consolidationRepository: ConsolidationResultRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
    private readonly getOrFetchClassification: GetOrFetchStockClassificationUseCase,
  ) {}

  async execute(): Promise<QueryMomentumLeadersResponseDto> {
    const leaders = await this.repository.getLatestScan();
    if (leaders.length === 0) {
      return {
        scanDate: null,
        universeSize: 0,
        count: 0,
        consolidatingCount: 0,
        leaders: [],
      };
    }

    const symbols = leaders.map((l) => l.symbol);
    const [daily, weekly, classifications, themesBySymbol] = await Promise.all([
      this.consolidationRepository.getLatestResults('daily'),
      this.consolidationRepository.getLatestResults('weekly'),
      this.getOrFetchClassification.executeMany(symbols),
      this.themeRepository.findThemesByTickers(symbols),
    ]);
    const dailySymbols = new Set(daily.map((r) => r.symbol.toUpperCase()));
    const weeklySymbols = new Set(weekly.map((r) => r.symbol.toUpperCase()));

    const dtos = leaders.map((leader) => {
      const key = leader.symbol.toUpperCase();
      return {
        symbol: leader.symbol,
        exchange: leader.exchange,
        sector: leader.sector,
        perf1M: leader.perf1M,
        perf3M: leader.perf3M,
        perf6M: leader.perf6M,
        rsScore: leader.rsScore,
        top1M: leader.top1M,
        top3M: leader.top3M,
        top6M: leader.top6M,
        consolidatingDaily: dailySymbols.has(key),
        consolidatingWeekly: weeklySymbols.has(key),
        themes: (themesBySymbol.get(key) ?? []).map((theme) => theme.name),
        industryGroup: classifications.get(key)?.industryGroup ?? null,
      };
    });

    return {
      scanDate: leaders[0].scanDate.toISOString().split('T')[0],
      universeSize: leaders[0].universeSize,
      count: dtos.length,
      consolidatingCount: dtos.filter(
        (d) => d.consolidatingDaily || d.consolidatingWeekly,
      ).length,
      leaders: dtos,
    };
  }
}
