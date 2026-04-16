import { DateRange } from '../../domain/value-objects/date-range';
import { Symbol } from '../../domain/value-objects/symbol';
import { YahooMarketDataService } from './yahoo-market-data.service';

describe('YahooMarketDataService', () => {
  function createService() {
    const service = new YahooMarketDataService();
    const yahooFinance = {
      chart: jest.fn(),
    };

    (
      service as unknown as {
        yahooFinance: {
          chart: jest.Mock;
        };
      }
    ).yahooFinance = yahooFinance;

    return { service, yahooFinance };
  }

  it('should fetch daily data directly from yahoo chart', async () => {
    const { service, yahooFinance } = createService();
    const symbol = Symbol.of('AAPL');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    yahooFinance.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2025-01-02T00:00:00.000Z'),
          open: 100,
          high: 105,
          low: 99,
          close: 104,
          volume: 1000,
        },
      ],
    });

    const result = await service.getHistoricalData(symbol, dateRange, '1d');

    expect(yahooFinance.chart).toHaveBeenNthCalledWith(1, symbol.value, {
      period1: dateRange.startDate,
      period2: dateRange.endDate,
      interval: '1d',
      return: 'array',
    });
    expect(result.symbol).toEqual(symbol);
    expect(result.dateRange).toEqual(dateRange);
    expect(result.pricePoints).toHaveLength(1);
    expect(result.pricePoints[0].close).toBe(104);
  });

  it('should fetch intraday data directly from yahoo chart', async () => {
    const { service, yahooFinance } = createService();
    const symbol = Symbol.of('AAPL');
    const dateRange = DateRange.of(
      new Date('2025-01-02T14:30:00.000Z'),
      new Date('2025-01-02T16:00:00.000Z'),
    );
    yahooFinance.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2025-01-02T14:30:00.000Z'),
          open: 100,
          high: 101,
          low: 99,
          close: 100.5,
          volume: 500,
        },
      ],
    });

    const result = await service.getHistoricalData(symbol, dateRange, '5m');

    expect(yahooFinance.chart).toHaveBeenNthCalledWith(1, symbol.value, {
      period1: dateRange.startDate,
      period2: dateRange.endDate,
      interval: '5m',
      return: 'array',
    });
    expect(result.symbol).toEqual(symbol);
    expect(result.dateRange).toEqual(dateRange);
    expect(result.pricePoints).toHaveLength(1);
    expect(result.pricePoints[0].close).toBe(100.5);
  });
});
