import type {
  HistoricalData,
  MarketDataService,
} from '../../domain/services/market-data.service';
import { YahooChartDataService } from './yahoo-chart-data.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('YahooChartDataService', () => {
  let service: YahooChartDataService;
  let marketDataService: jest.Mocked<MarketDataService>;

  beforeEach(() => {
    marketDataService = { getHistoricalData: jest.fn() };
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints: [],
    } as unknown as HistoricalData);
    service = new YahooChartDataService(marketDataService);
  });

  async function requestedDaysBack(
    interval: Parameters<YahooChartDataService['getChartData']>[2],
    bars: number,
  ): Promise<number> {
    await service.getChartData('AAPL', 'NASDAQ', interval, bars);
    const dateRange = marketDataService.getHistoricalData.mock.calls[0][1];
    return Math.round(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / DAY_MS,
    );
  }

  it.each([
    ['1', 7],
    ['5', 59],
    ['15', 59],
    ['30', 59],
    ['60', 729],
  ] as const)(
    'caps a %s-minute request at %i days back',
    async (interval, maxDaysBack) => {
      expect(await requestedDaysBack(interval, 5000)).toBe(maxDaysBack);
    },
  );

  it('does not raise a small intraday request to the cap', async () => {
    expect(await requestedDaysBack('15', 520)).toBe(32);
  });

  it('does not cap daily requests', async () => {
    expect(await requestedDaysBack('D', 5000)).toBe(7500);
  });

  describe('on a Monday before the open', () => {
    const REGULAR_SESSION_5M_BARS = 78;

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function completedWeekdaysWithin(daysBack: number): number {
      const now = new Date();
      let weekdays = 0;
      for (let offset = 1; offset <= daysBack; offset++) {
        const day = new Date(now.getTime() - offset * DAY_MS).getUTCDay();
        if (day !== 0 && day !== 6) weekdays++;
      }
      return weekdays;
    }

    it.each([520, 720, 920, 1120])(
      'requests enough regular-session 5-minute history for %i bars',
      async (bars) => {
        const daysBack = await requestedDaysBack('5', bars);
        expect(
          completedWeekdaysWithin(daysBack) * REGULAR_SESSION_5M_BARS,
        ).toBeGreaterThanOrEqual(bars);
      },
    );
  });
});
