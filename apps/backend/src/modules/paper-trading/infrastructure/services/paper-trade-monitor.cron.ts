import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import {
  PaperTrade,
  PaperTradeExitReason,
} from '../../domain/entities/paper-trade';
import type { PaperTradeReadRepository } from '../../domain/repositories/paper-trade-read.repository.interface';
import { PAPER_TRADE_READ_REPOSITORY } from '../../constants/tokens';
import { ClosePaperTradeUseCase } from '../../use-cases/close-paper-trade.use-case';
import { isWithinMarketHours } from '../../../watchlist-monitoring/infrastructure/services/market-time.util';

const RECENT_BARS_LOOKBACK_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class PaperTradeMonitorCronService {
  private readonly logger = new Logger(PaperTradeMonitorCronService.name);

  constructor(
    @Inject(PAPER_TRADE_READ_REPOSITORY)
    private readonly readRepository: PaperTradeReadRepository,
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    private readonly closePaperTrade: ClosePaperTradeUseCase,
  ) {}

  @Cron('*/5 * * * 1-5', { timeZone: 'America/Toronto' })
  async monitorOpenTrades(): Promise<void> {
    if (!isWithinMarketHours()) {
      return;
    }

    const jobName = 'Paper Trade Exit Monitoring';
    this.logger.log(`Starting ${jobName}...`);

    try {
      const openTrades = await this.readRepository.findOpen();
      this.logger.log(`Found ${openTrades.length} open paper trades`);

      for (const trade of openTrades) {
        await this.evaluateTrade(trade);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${message}`);
    }
  }

  private async evaluateTrade(trade: PaperTrade): Promise<void> {
    try {
      const latestBar = await this.fetchLatestBar(trade);
      if (!latestBar) {
        return;
      }

      const now = new Date();

      if (latestBar.low <= trade.stopPrice) {
        await this.closePaperTrade.execute({
          trade,
          exitPrice: trade.stopPrice,
          exitReason: PaperTradeExitReason.STOP,
          closedAt: now,
        });
        return;
      }

      if (latestBar.high >= trade.targetPrice) {
        await this.closePaperTrade.execute({
          trade,
          exitPrice: trade.targetPrice,
          exitReason: PaperTradeExitReason.TARGET,
          closedAt: now,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to evaluate paper trade for ${trade.ticker.value}: ${message}`,
      );
    }
  }

  private async fetchLatestBar(trade: PaperTrade): Promise<PricePoint | null> {
    const now = new Date();
    const start = new Date(now.getTime() - RECENT_BARS_LOOKBACK_MS);
    const dateRange = DateRange.of(start, now);

    const data = await this.marketDataService.getHistoricalData(
      Symbol.of(trade.ticker.symbolOnly),
      dateRange,
      '5m',
    );

    if (data.pricePoints.length === 0) {
      return null;
    }

    return [...data.pricePoints].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )[0];
  }
}
