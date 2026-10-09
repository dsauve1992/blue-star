import { ConfigService } from '@nestjs/config';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { FinnhubFundamentalService } from './finnhub-fundamental.service';

interface RowInput {
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
  revenue?: number;
  eps?: number;
  filedDate?: string;
}

function row(input: RowInput) {
  const ic: { concept: string; value: number }[] = [];
  if (input.revenue != null) {
    ic.push({ concept: 'us-gaap_Revenues', value: input.revenue });
  }
  if (input.eps != null) {
    ic.push({ concept: 'us-gaap_EarningsPerShareDiluted', value: input.eps });
  }
  return {
    symbol: 'TEST',
    year: input.year,
    quarter: input.quarter,
    form: '10-Q',
    startDate: input.startDate,
    endDate: input.endDate,
    filedDate: input.filedDate ?? `${input.endDate} 00:00:00`,
    report: { ic },
  };
}

describe('FinnhubFundamentalService', () => {
  let service: FinnhubFundamentalService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new FinnhubFundamentalService({
      get: () => 'test-key',
    } as unknown as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockRows(data: ReturnType<typeof row>[]) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ symbol: 'TEST', data }),
    });
  }

  async function fetchQuarters() {
    const statements = await service.getIncomeStatementHistory(
      Symbol.of('TEST'),
    );
    return statements.map((s) => ({
      label: `${s.period} ${s.fiscalYear}`,
      revenue: s.revenue,
      eps: s.eps,
    }));
  }

  it('should derive standalone quarters from clean calendar-year YTD rows', async () => {
    mockRows([
      row({
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        revenue: 100,
        eps: 1,
      }),
      row({
        year: 2024,
        quarter: 2,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        revenue: 210,
        eps: 2.1,
      }),
      row({
        year: 2024,
        quarter: 3,
        startDate: '2024-01-01',
        endDate: '2024-09-30',
        revenue: 330,
        eps: 3.3,
      }),
    ]);

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => [q.label, q.revenue])).toEqual([
      ['Q3 2024', 120],
      ['Q2 2024', 110],
      ['Q1 2024', 100],
    ]);
    expect(quarters[0].eps).toBeCloseTo(1.2);
    expect(quarters[1].eps).toBeCloseTo(1.1);
  });

  it('should not derive a quarter whose predecessor is missing its revenue concept', async () => {
    mockRows([
      row({
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        revenue: 100,
        eps: 1,
      }),
      row({
        year: 2024,
        quarter: 2,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        eps: 2.1,
      }),
      row({
        year: 2024,
        quarter: 3,
        startDate: '2024-01-01',
        endDate: '2024-09-30',
        revenue: 330,
        eps: 3.3,
      }),
    ]);

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => [q.label, q.revenue])).toEqual([
      ['Q1 2024', 100],
    ]);
  });

  it('should derive Q3 from H1 when the Q1 row is missing its revenue concept', async () => {
    mockRows([
      row({
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        eps: 1,
      }),
      row({
        year: 2024,
        quarter: 2,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        revenue: 210,
        eps: 2.1,
      }),
      row({
        year: 2024,
        quarter: 3,
        startDate: '2024-01-01',
        endDate: '2024-09-30',
        revenue: 330,
        eps: 3.3,
      }),
    ]);

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => [q.label, q.revenue])).toEqual([
      ['Q3 2024', 120],
    ]);
  });

  it('should relabel a Q1 that Finnhub files under the previous fiscal year mid-history', async () => {
    mockRows([
      row({
        year: 2026,
        quarter: 3,
        startDate: '2025-02-01',
        endDate: '2025-10-31',
        revenue: 3506.6,
        eps: -0.95,
      }),
      row({
        year: 2026,
        quarter: 2,
        startDate: '2025-02-01',
        endDate: '2025-07-31',
        revenue: 2272.4,
        eps: -0.52,
      }),
      row({
        year: 2025,
        quarter: 1,
        startDate: '2025-02-01',
        endDate: '2025-04-30',
        revenue: 1103.4,
        eps: -0.44,
      }),
      row({
        year: 2025,
        quarter: 3,
        startDate: '2024-02-01',
        endDate: '2024-10-31',
        revenue: 2895.1,
        eps: 0.29,
      }),
      row({
        year: 2025,
        quarter: 2,
        startDate: '2024-02-01',
        endDate: '2024-07-31',
        revenue: 1884.9,
        eps: 0.29,
      }),
      row({
        year: 2025,
        quarter: 1,
        startDate: '2024-02-01',
        endDate: '2024-04-30',
        revenue: 921.0,
        eps: 0.17,
      }),
    ]);

    const quarters = await fetchQuarters();
    const revenueByLabel = (label: string) =>
      quarters.filter((q) => q.label === label).map((q) => q.revenue);

    expect(revenueByLabel('Q1 2025')).toEqual([921.0]);
    expect(revenueByLabel('Q1 2026')).toEqual([1103.4]);
    expect(revenueByLabel('Q2 2026')[0]).toBeCloseTo(1169.0);
    expect(revenueByLabel('Q3 2026')[0]).toBeCloseTo(1234.2);
    expect(quarters).toHaveLength(6);
  });

  it('should relabel the newest Q1 that Finnhub files under the previous fiscal year', async () => {
    mockRows([
      row({
        year: 2026,
        quarter: 1,
        startDate: '2026-06-01',
        endDate: '2026-08-31',
        revenue: 150,
        eps: 1.5,
      }),
      row({
        year: 2026,
        quarter: 3,
        startDate: '2025-06-01',
        endDate: '2026-02-28',
        revenue: 360,
        eps: 3.6,
      }),
      row({
        year: 2026,
        quarter: 2,
        startDate: '2025-06-01',
        endDate: '2025-11-30',
        revenue: 230,
        eps: 2.3,
      }),
      row({
        year: 2026,
        quarter: 1,
        startDate: '2025-06-01',
        endDate: '2025-08-31',
        revenue: 110,
        eps: 1.1,
      }),
    ]);

    const quarters = await fetchQuarters();

    expect(quarters[0]).toMatchObject({ label: 'Q1 2027', revenue: 150 });
    expect(quarters.filter((q) => q.label === 'Q1 2026')).toHaveLength(1);
  });

  it('should keep only the latest filing of an exactly duplicated period', async () => {
    mockRows([
      row({
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        revenue: 100,
        eps: 1,
        filedDate: '2024-05-01 00:00:00',
      }),
      row({
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        revenue: 105,
        eps: 1.05,
        filedDate: '2024-08-01 00:00:00',
      }),
    ]);

    const quarters = await fetchQuarters();

    expect(quarters).toEqual([{ label: 'Q1 2024', revenue: 105, eps: 1.05 }]);
  });
});
