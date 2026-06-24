import { Test, TestingModule } from '@nestjs/testing';
import { PaperTradeMonitorCronService } from './paper-trade-monitor.cron';
import { ClosePaperTradeUseCase } from '../../use-cases/close-paper-trade.use-case';
import { PaperTradeExitReason } from '../../domain/entities/paper-trade';
import { PaperTrade } from '../../domain/entities/paper-trade';
import { Shares } from '../../domain/value-objects/shares';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import type { HistoricalData } from '../../../market-data/domain/services/market-data.service';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import type { PaperTradeReadRepository } from '../../domain/repositories/paper-trade-read.repository.interface';
import { PAPER_TRADE_READ_REPOSITORY } from '../../constants/tokens';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import * as marketTime from '../../../watchlist-monitoring/infrastructure/services/market-time.util';

describe('PaperTradeMonitorCronService', () => {
  let service: PaperTradeMonitorCronService;
  let readRepository: jest.Mocked<PaperTradeReadRepository>;
  let marketDataService: jest.Mocked<MarketDataService>;
  let closePaperTrade: jest.Mocked<ClosePaperTradeUseCase>;

  function buildTrade(): PaperTrade {
    return PaperTrade.open({
      ticker: WatchlistTicker.of('AAPL'),
      entryPrice: 108,
      stopPrice: 100,
      targetPrice: 156,
      shares: Shares.of(6),
      marketDate: '2026-06-24',
      openedAt: new Date('2026-06-24T13:35:00.000Z'),
      context: {
        industryGroup: null,
        globalRsRating: null,
        industryGroupRsRating: null,
        industryGroupQuadrant: null,
      },
    });
  }

  function bar(low: number, high: number): PricePoint {
    return PricePoint.of(
      new Date('2026-06-24T15:00:00.000Z'),
      Math.max(low, Math.min(high, 110)),
      high,
      low,
      Math.max(low, Math.min(high, 110)),
      1000,
    );
  }

  function historical(points: PricePoint[]): HistoricalData {
    return {
      symbol: Symbol.of('AAPL'),
      dateRange: DateRange.of(
        new Date('2026-06-24T09:00:00.000Z'),
        new Date('2026-06-24T15:30:00.000Z'),
      ),
      pricePoints: points,
    };
  }

  beforeEach(async () => {
    jest.spyOn(marketTime, 'isWithinMarketHours').mockReturnValue(true);

    readRepository = {
      findById: jest.fn(),
      findOpen: jest.fn().mockResolvedValue([buildTrade()]),
      hasOpenTrade: jest.fn(),
      list: jest.fn(),
      getRealizedPnl: jest.fn(),
      getCommittedCash: jest.fn(),
    };
    marketDataService = { getHistoricalData: jest.fn() };
    closePaperTrade = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClosePaperTradeUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaperTradeMonitorCronService,
        { provide: PAPER_TRADE_READ_REPOSITORY, useValue: readRepository },
        { provide: MARKET_DATA_SERVICE, useValue: marketDataService },
        { provide: ClosePaperTradeUseCase, useValue: closePaperTrade },
      ],
    }).compile();

    service = module.get(PaperTradeMonitorCronService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('closes at the stop when the latest bar low breaches it', async () => {
    marketDataService.getHistoricalData.mockResolvedValue(
      historical([bar(99, 105)]),
    );

    await service.monitorOpenTrades();

    expect(closePaperTrade.execute).toHaveBeenCalledTimes(1);
    expect(closePaperTrade.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        exitPrice: 100,
        exitReason: PaperTradeExitReason.STOP,
      }),
    );
  });

  it('closes at the target when the latest bar high reaches it', async () => {
    marketDataService.getHistoricalData.mockResolvedValue(
      historical([bar(120, 157)]),
    );

    await service.monitorOpenTrades();

    expect(closePaperTrade.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        exitPrice: 156,
        exitReason: PaperTradeExitReason.TARGET,
      }),
    );
  });

  it('prefers the stop when a single bar spans both stop and target', async () => {
    marketDataService.getHistoricalData.mockResolvedValue(
      historical([bar(99, 157)]),
    );

    await service.monitorOpenTrades();

    expect(closePaperTrade.execute).toHaveBeenCalledWith(
      expect.objectContaining({ exitReason: PaperTradeExitReason.STOP }),
    );
  });

  it('does not close when price stays between stop and target', async () => {
    marketDataService.getHistoricalData.mockResolvedValue(
      historical([bar(102, 150)]),
    );

    await service.monitorOpenTrades();

    expect(closePaperTrade.execute).not.toHaveBeenCalled();
  });

  it('skips entirely outside market hours', async () => {
    jest.spyOn(marketTime, 'isWithinMarketHours').mockReturnValue(false);

    await service.monitorOpenTrades();

    expect(readRepository.findOpen).not.toHaveBeenCalled();
    expect(marketDataService.getHistoricalData).not.toHaveBeenCalled();
  });
});
