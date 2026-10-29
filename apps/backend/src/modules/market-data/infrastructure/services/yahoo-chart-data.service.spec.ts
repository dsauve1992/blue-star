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

  it('caps a 15-minute request at 59 days back', async () => {
    expect(await requestedDaysBack('15', 5000)).toBeLessThanOrEqual(59);
  });

  it('does not cap daily requests', async () => {
    expect(await requestedDaysBack('D', 5000)).toBe(7500);
  });
});
