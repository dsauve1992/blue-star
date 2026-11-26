import { MarketDataDailyBarProvider } from './market-data-daily-bar-provider.service';
import {
  GetHistoricalDataUseCase,
  PricePoint,
} from '../../../market-data/market-data.module';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';
import { SessionDate } from '../../domain/value-objects/session-date';

const bar = (isoDate: string, close: number) =>
  PricePoint.of(new Date(isoDate), close, close + 1, close - 1, close, 1000);

describe('MarketDataDailyBarProvider', () => {
  let getHistoricalData: { execute: jest.Mock };
  let provider: MarketDataDailyBarProvider;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-25T23:10:00.000Z') });
    getHistoricalData = { execute: jest.fn() };
    provider = new MarketDataDailyBarProvider(
      getHistoricalData as unknown as GetHistoricalDataUseCase,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should key each bar by its market session date and keep the last bar of a duplicated session', async () => {
    getHistoricalData.execute.mockResolvedValue({
      historicalData: {
        pricePoints: [
          bar('2026-11-24T14:30:00.000Z', 10),
          bar('2026-11-25T14:30:00.000Z', 11),
          bar('2026-11-26T01:00:00.000Z', 12),
        ],
      },
    });

    const bars = await provider.dailyBarsSince(
      Symbol.of('AAA'),
      SessionDate.of('2025-10-21'),
    );

    expect(getHistoricalData.execute).toHaveBeenNthCalledWith(1, {
      symbol: Symbol.of('AAA'),
      dateRange: DateRange.of(
        new Date('2025-10-21T00:00:00.000Z'),
        new Date('2026-11-25T23:10:00.000Z'),
      ),
      interval: '1d',
    });
    expect(bars).toEqual([
      { date: SessionDate.of('2026-11-24'), high: 11, low: 9, close: 10 },
      { date: SessionDate.of('2026-11-25'), high: 13, low: 11, close: 12 },
    ]);
  });

  it('should ask Yahoo for a class share in its dash form', async () => {
    getHistoricalData.execute.mockResolvedValue({
      historicalData: { pricePoints: [bar('2026-11-25T14:30:00.000Z', 10)] },
    });

    await provider.dailyBarsSince(
      Symbol.of('BRK.B'),
      SessionDate.of('2025-10-21'),
    );

    expect(getHistoricalData.execute).toHaveBeenNthCalledWith(1, {
      symbol: Symbol.of('BRK-B'),
      dateRange: DateRange.of(
        new Date('2025-10-21T00:00:00.000Z'),
        new Date('2026-11-25T23:10:00.000Z'),
      ),
      interval: '1d',
    });
  });
});
