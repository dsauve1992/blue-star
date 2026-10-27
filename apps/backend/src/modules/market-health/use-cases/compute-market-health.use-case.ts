import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { MarketDataService } from '../../market-data/market-data.module';
import { Symbol } from '../../../shared/value-objects/symbol';
import { DateRange } from '../../../shared/value-objects/date-range';
import type { MarketHealthRepository } from '../domain/repositories/market-health.repository.interface';
import { MarketHealth } from '../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../domain/value-objects/market-health-status';
import { MARKET_HEALTH_REPOSITORY } from '../constants/tokens';
import { MARKET_DATA_SERVICE } from '../../market-data/market-data.module';

export type ComputeMarketHealthResponseDto = MarketHealth;

@Injectable()
export class ComputeMarketHealthUseCase {
  private readonly logger = new Logger(ComputeMarketHealthUseCase.name);
  private readonly spySymbol = Symbol.of('SPY');

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(MARKET_HEALTH_REPOSITORY)
    private readonly marketHealthRepository: MarketHealthRepository,
  ) {}

  async execute(): Promise<ComputeMarketHealthResponseDto> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const dateRange = DateRange.of(ninetyDaysAgo, yesterday);
    const historicalData = await this.marketDataService.getHistoricalData(
      this.spySymbol,
      dateRange,
      '1d',
    );

    const closes = [...historicalData.pricePoints]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => p.close);

    if (closes.length < 22) {
      throw new Error(
        `Not enough data points to compute EMAs: ${closes.length}`,
      );
    }

    const ema9Values = this.computeEma(closes, 9);
    const ema21Values = this.computeEma(closes, 21);

    const currentEma9 = ema9Values[ema9Values.length - 1];
    const previousEma9 = ema9Values[ema9Values.length - 2];
    const currentEma21 = ema21Values[ema21Values.length - 1];
    const previousEma21 = ema21Values[ema21Values.length - 2];

    const status = this.deriveStatus(
      currentEma9,
      previousEma9,
      currentEma21,
      previousEma21,
    );

    const marketHealth = MarketHealth.create({
      id: randomUUID(),
      status,
      ema9: Math.round(currentEma9 * 10000) / 10000,
      ema21: Math.round(currentEma21 * 10000) / 10000,
      computedAt: new Date(),
    });

    await this.marketHealthRepository.save(marketHealth);
    this.logger.log(
      `Market health computed: ${status.value} (EMA9=${currentEma9.toFixed(2)}, EMA21=${currentEma21.toFixed(2)})`,
    );

    return marketHealth;
  }

  private computeEma(closes: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const emaValues: number[] = [];

    let ema =
      closes.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    emaValues.push(ema);

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * multiplier + ema * (1 - multiplier);
      emaValues.push(ema);
    }

    return emaValues;
  }

  private deriveStatus(
    currentEma9: number,
    previousEma9: number,
    currentEma21: number,
    previousEma21: number,
  ): MarketHealthStatus {
    if (currentEma9 <= currentEma21) {
      return MarketHealthStatus.bad();
    }

    const ema9Rising = currentEma9 > previousEma9;
    const ema21Rising = currentEma21 > previousEma21;

    if (ema9Rising && ema21Rising) {
      return MarketHealthStatus.good();
    }

    return MarketHealthStatus.warning();
  }
}
