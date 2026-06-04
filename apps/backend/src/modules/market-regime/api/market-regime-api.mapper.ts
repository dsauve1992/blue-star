import { Injectable } from '@nestjs/common';
import { ExposureBand } from '../domain/value-objects/exposure-band';
import type { GetMarketRegimeResult } from '../use-cases/get-market-regime.use-case';
import type { MarketRegime } from '../domain/entities/market-regime.entity';
import type { MarketRegimeApiResponseDto } from './market-regime-api.dto';

@Injectable()
export class MarketRegimeApiMapper {
  mapToResponse(result: GetMarketRegimeResult): MarketRegimeApiResponseDto {
    // Controller guards null — regime is always present here.
    const regime = result.regime as MarketRegime;
    const exposureBand = ExposureBand.forRegime(regime.state);

    return {
      state: regime.state.value,
      marketHealthStatus: regime.marketHealthStatus,
      leaderCount: regime.leaderCount,
      leaderCountMa: regime.leaderCountMa,
      breadthSignal: regime.breadthSignal.value,
      exposureBand: {
        perTradeRiskPct: exposureBand.perTradeRiskPct,
        maxPortfolioHeatPct: exposureBand.maxPortfolioHeatPct,
        maxSectorHeatPct: exposureBand.maxSectorHeatPct,
        maxPositions: exposureBand.maxPositions,
        posture: exposureBand.posture,
      },
      computedAt: regime.computedAt.toISOString(),
      breadthSeries: result.breadthSeries.map((snapshot) => ({
        computedAt: snapshot.computedAt.toISOString(),
        leaderCount: snapshot.leaderCount,
        totalUniverse: snapshot.totalUniverse,
      })),
    };
  }
}
