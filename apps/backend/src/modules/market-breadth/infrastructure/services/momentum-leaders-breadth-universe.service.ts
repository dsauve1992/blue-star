import { Injectable } from '@nestjs/common';
import {
  MarketBreadthUniversePayload,
  MarketBreadthUniverseService,
} from '../../domain/services/market-breadth-universe.service';
import { GetLatestMomentumLeaderSymbolsUseCase } from '../../../stock-analysis/use-cases/get-latest-momentum-leader-symbols.use-case';
import { BreadthDate } from '../../domain/value-objects/breadth-date';

@Injectable()
export class MomentumLeadersBreadthUniverseService
  implements MarketBreadthUniverseService
{
  constructor(
    private readonly getLatestMomentumLeaderSymbols: GetLatestMomentumLeaderSymbolsUseCase,
  ) {}

  async fetchUniverse(): Promise<MarketBreadthUniversePayload> {
    const latest = await this.getLatestMomentumLeaderSymbols.execute();
    if (latest === null) {
      throw new Error(
        'Market breadth universe is empty: no momentum leaders scan has been saved yet',
      );
    }
    return {
      scan_date: BreadthDate.of(latest.scanDate).toISOString(),
      universe_size: latest.symbols.length,
      symbols: latest.symbols,
    };
  }
}
