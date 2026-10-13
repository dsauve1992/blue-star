import { Symbol } from '../../../../shared/value-objects/symbol';
import { YahooEarningsExpectationsService } from './yahoo-earnings-expectations.service';

describe('YahooEarningsExpectationsService', () => {
  function createService() {
    const service = new YahooEarningsExpectationsService();
    const yahooFinance = { quoteSummary: jest.fn() };
    (
      service as unknown as { yahooFinance: { quoteSummary: jest.Mock } }
    ).yahooFinance = yahooFinance;
    return { service, yahooFinance };
  }

  const trendEntry = (period: string, overrides: object = {}) => ({
    period,
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    earningsEstimate: { numberOfAnalysts: 9 },
    revenueEstimate: {
      avg: 412730070,
      yearAgoRevenue: 263500000,
      growth: 0.5663,
    },
    epsTrend: { current: -0.451, '30daysAgo': -0.49571, '90daysAgo': -0.56438 },
    epsRevisions: { upLast30days: 1, downLast30days: 1 },
    ...overrides,
  });

  it('requests the earnings history and trend modules for the symbol', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockResolvedValue({});

    await service.getEarningsExpectations(Symbol.of('IOVA'));

    expect(yahooFinance.quoteSummary).toHaveBeenCalledWith('IOVA', {
      modules: ['earningsHistory', 'earningsTrend'],
    });
  });

  it('maps reported quarters and skips quarters without an actual or estimate', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockResolvedValue({
      earningsHistory: {
        history: [
          {
            quarter: new Date('2026-06-30T00:00:00.000Z'),
            epsActual: -0.11,
            epsEstimate: -0.13486,
          },
          {
            quarter: new Date('2026-09-30T00:00:00.000Z'),
            epsActual: null,
            epsEstimate: -0.08,
          },
        ],
      },
    });

    const { surprises } = await service.getEarningsExpectations(
      Symbol.of('IOVA'),
    );

    expect(surprises).toHaveLength(1);
    expect(surprises[0]).toMatchObject({
      quarterEnd: '2026-06-30',
      epsActual: -0.11,
      epsEstimate: -0.13486,
    });
  });

  it('keeps only quarter and year estimate periods and converts revenue growth to percent', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockResolvedValue({
      earningsTrend: {
        trend: [trendEntry('0y'), trendEntry('LTG'), trendEntry('-5y')],
      },
    });

    const { estimateTrends } = await service.getEarningsExpectations(
      Symbol.of('IOVA'),
    );

    expect(estimateTrends).toHaveLength(1);
    expect(estimateTrends[0]).toMatchObject({
      period: '0y',
      endDate: '2026-12-31',
      analystCount: 9,
      epsEstimate: -0.451,
      epsEstimate30DaysAgo: -0.49571,
      epsEstimate90DaysAgo: -0.56438,
      upRevisionsLast30Days: 1,
      downRevisionsLast30Days: 1,
      revenueEstimate: 412730070,
    });
    expect(estimateTrends[0].revenueGrowthPercent).toBeCloseTo(56.63);
  });

  it('treats a zero revenue estimate as no revenue coverage', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockResolvedValue({
      earningsTrend: {
        trend: [
          trendEntry('0q', {
            revenueEstimate: { avg: 0, yearAgoRevenue: 0, growth: 0 },
          }),
        ],
      },
    });

    const { estimateTrends } = await service.getEarningsExpectations(
      Symbol.of('KOD'),
    );

    expect(estimateTrends[0].revenueEstimate).toBeNull();
    expect(estimateTrends[0].revenueGrowthPercent).toBeNull();
  });

  it('has no revenue growth when there was no revenue a year ago', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockResolvedValue({
      earningsTrend: {
        trend: [
          trendEntry('+1y', {
            revenueEstimate: { avg: 49138520, yearAgoRevenue: 0, growth: 0 },
          }),
        ],
      },
    });

    const { estimateTrends } = await service.getEarningsExpectations(
      Symbol.of('KOD'),
    );

    expect(estimateTrends[0].revenueEstimate).toBe(49138520);
    expect(estimateTrends[0].revenueGrowthPercent).toBeNull();
  });

  it.each([
    'No fundamentals data found for symbol: SPY',
    'Quote not found for symbol: ZZZZZZ',
  ])(
    'returns empty expectations when Yahoo has no coverage (%s)',
    async (message) => {
      const { service, yahooFinance } = createService();
      yahooFinance.quoteSummary.mockRejectedValue(new Error(message));

      const expectations = await service.getEarningsExpectations(
        Symbol.of('SPY'),
      );

      expect(expectations.surprises).toEqual([]);
      expect(expectations.estimateTrends).toEqual([]);
    },
  );

  it('rethrows other Yahoo failures', async () => {
    const { service, yahooFinance } = createService();
    yahooFinance.quoteSummary.mockRejectedValue(new Error('HTTP 429'));

    await expect(
      service.getEarningsExpectations(Symbol.of('IOVA')),
    ).rejects.toThrow('HTTP 429');
  });
});
