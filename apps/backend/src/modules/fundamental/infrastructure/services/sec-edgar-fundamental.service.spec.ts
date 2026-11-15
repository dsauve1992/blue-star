import { ConfigService } from '@nestjs/config';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { SecEdgarFundamentalService } from './sec-edgar-fundamental.service';
import { ComputeFinancialReportUseCase } from '../../use-cases/compute-financial-report.use-case';

interface FactInput {
  start: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form?: string;
  filed?: string;
}

function fact(input: FactInput) {
  return { form: '10-Q', filed: input.end, ...input };
}

interface FilingInput {
  accn: string;
  fy: number;
  fp: string;
  form?: string;
  filed?: string;
  periods: { start: string; end: string; revenue?: number; eps?: number }[];
}

function companyFacts(
  filings: FilingInput[],
  revenueConcept = 'RevenueFromContractWithCustomerExcludingAssessedTax',
) {
  const revenue = filings.flatMap(({ periods, ...filing }) =>
    periods
      .filter((period) => period.revenue != null)
      .map((period) => fact({ ...filing, ...period, val: period.revenue! })),
  );
  const eps = filings.flatMap(({ periods, ...filing }) =>
    periods
      .filter((period) => period.eps != null)
      .map((period) => fact({ ...filing, ...period, val: period.eps! })),
  );
  return {
    facts: {
      'us-gaap': {
        [revenueConcept]: { units: { USD: revenue } },
        EarningsPerShareDiluted: { units: { 'USD/shares': eps } },
      },
    },
  };
}

type EpsRow = [
  start: string,
  end: string,
  val: number,
  filed: string,
  fy: number,
  fp: string,
];

function epsFacts(diluted: EpsRow[], basic: EpsRow[] = []) {
  const toFacts = (rows: EpsRow[]) => ({
    units: {
      'USD/shares': rows.map(([start, end, val, filed, fy, fp]) => ({
        start,
        end,
        val,
        filed,
        fy,
        fp,
        accn: filed,
        form: fp === 'FY' ? '10-K' : '10-Q',
      })),
    },
  });
  return {
    facts: {
      'us-gaap': {
        EarningsPerShareDiluted: toFacts(diluted),
        EarningsPerShareBasic: toFacts(basic),
      },
    },
  };
}

const nvidiaAcrossTenForOneSplit: EpsRow[] = [
  ['2023-01-30', '2023-04-30', 0.82, '2023-05-26', 2024, 'Q1'],
  ['2023-05-01', '2023-07-30', 2.48, '2023-08-28', 2024, 'Q2'],
  ['2023-01-30', '2023-07-30', 3.3, '2023-08-28', 2024, 'Q2'],
  ['2023-07-31', '2023-10-29', 3.71, '2023-11-21', 2024, 'Q3'],
  ['2023-01-30', '2024-01-28', 11.93, '2024-02-21', 2024, 'FY'],
  ['2024-01-29', '2024-04-28', 5.98, '2024-05-29', 2025, 'Q1'],
  ['2023-01-30', '2023-04-30', 0.82, '2024-05-29', 2025, 'Q1'],
  ['2024-04-29', '2024-07-28', 0.67, '2024-08-28', 2025, 'Q2'],
  ['2023-05-01', '2023-07-30', 0.25, '2024-08-28', 2025, 'Q2'],
  ['2023-01-30', '2023-07-30', 0.33, '2024-08-28', 2025, 'Q2'],
  ['2024-07-29', '2024-10-27', 0.78, '2024-11-20', 2025, 'Q3'],
  ['2023-07-31', '2023-10-29', 0.37, '2024-11-20', 2025, 'Q3'],
  ['2024-01-29', '2025-01-26', 2.94, '2025-02-26', 2025, 'FY'],
  ['2023-01-30', '2024-01-28', 1.19, '2025-02-26', 2025, 'FY'],
  ['2025-01-27', '2025-04-27', 0.76, '2025-05-28', 2026, 'Q1'],
  ['2024-01-29', '2024-04-28', 0.6, '2025-05-28', 2026, 'Q1'],
];

const calendarYear2024: FilingInput[] = [
  {
    accn: 'q1',
    fy: 2024,
    fp: 'Q1',
    periods: [{ start: '2024-01-01', end: '2024-03-31', revenue: 100, eps: 1 }],
  },
  {
    accn: 'q2',
    fy: 2024,
    fp: 'Q2',
    periods: [
      { start: '2024-04-01', end: '2024-06-30', revenue: 110, eps: 1.1 },
      { start: '2024-01-01', end: '2024-06-30', revenue: 210, eps: 2.1 },
    ],
  },
  {
    accn: 'q3',
    fy: 2024,
    fp: 'Q3',
    periods: [
      { start: '2024-07-01', end: '2024-09-30', revenue: 120, eps: 1.2 },
      { start: '2024-01-01', end: '2024-09-30', revenue: 330, eps: 3.3 },
    ],
  },
  {
    accn: 'k',
    fy: 2024,
    fp: 'FY',
    form: '10-K',
    periods: [
      { start: '2024-01-01', end: '2024-12-31', revenue: 460, eps: 4.6 },
    ],
  },
];

describe('SecEdgarFundamentalService', () => {
  let service: SecEdgarFundamentalService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new SecEdgarFundamentalService({
      get: () => 'test@example.com',
    } as unknown as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockSec(facts: unknown, factsStatus = 200) {
    fetchMock = jest.fn((url: string) =>
      Promise.resolve(
        url.endsWith('company_tickers.json')
          ? {
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  0: { cik_str: 1425205, ticker: 'TEST' },
                  1: { cik_str: 1067983, ticker: 'BRK-B' },
                }),
            }
          : {
              ok: factsStatus === 200,
              status: factsStatus,
              json: () => Promise.resolve(facts),
            },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
  }

  async function fetchQuarters(symbol = 'TEST') {
    const statements = await service.getIncomeStatementHistory(
      Symbol.of(symbol),
    );
    return statements.map((s) => ({
      label: `${s.period} ${s.fiscalYear}`,
      revenue: s.revenue,
      eps: s.eps,
    }));
  }

  it('should require a contact email for the SEC User-Agent', () => {
    expect(
      () =>
        new SecEdgarFundamentalService({
          get: () => undefined,
        } as unknown as ConfigService),
    ).toThrow('SEC_EDGAR_CONTACT_EMAIL is required');
  });

  it('should send the contact email in the User-Agent and pad the CIK', async () => {
    mockSec(companyFacts(calendarYear2024));

    await fetchQuarters();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://data.sec.gov/api/xbrl/companyfacts/CIK0001425205.json',
      expect.objectContaining({
        headers: { 'User-Agent': 'BlueStar test@example.com' },
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('should take standalone quarters and derive Q4 from the annual report', async () => {
    mockSec(companyFacts(calendarYear2024));

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => q.label)).toEqual([
      'Q4 2024',
      'Q3 2024',
      'Q2 2024',
      'Q1 2024',
    ]);
    expect(quarters[0].revenue).toBe(130);
    expect(quarters[0].eps).toBeCloseTo(1.3);
    expect(quarters[2]).toEqual({ label: 'Q2 2024', revenue: 110, eps: 1.1 });
  });

  it('should not derive Q4 when an earlier quarter of that fiscal year is missing', async () => {
    mockSec(
      companyFacts(calendarYear2024.filter((filing) => filing.accn !== 'q2')),
    );

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => q.label)).toEqual(['Q3 2024', 'Q1 2024']);
  });

  it('should label quarters by fiscal year for off-calendar filers', async () => {
    mockSec(
      companyFacts([
        {
          accn: 'q1',
          fy: 2026,
          fp: 'Q1',
          periods: [
            { start: '2025-07-01', end: '2025-09-30', revenue: 10, eps: 1 },
          ],
        },
        {
          accn: 'q1-next',
          fy: 2027,
          fp: 'Q1',
          periods: [
            { start: '2026-07-01', end: '2026-09-30', revenue: 15, eps: 1.5 },
            { start: '2025-07-01', end: '2025-09-30', revenue: 10, eps: 1 },
          ],
        },
      ]),
    );

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => q.label)).toEqual(['Q1 2027', 'Q1 2026']);
  });

  it('should use the latest filed value when a period is restated', async () => {
    mockSec(
      companyFacts([
        {
          accn: 'original',
          fy: 2024,
          fp: 'Q1',
          filed: '2024-05-01',
          periods: [
            { start: '2024-01-01', end: '2024-03-31', revenue: 100, eps: 1 },
          ],
        },
        {
          accn: 'restated',
          fy: 2025,
          fp: 'Q1',
          filed: '2025-05-01',
          periods: [
            { start: '2025-01-01', end: '2025-03-31', revenue: 130, eps: 1.3 },
            { start: '2024-01-01', end: '2024-03-31', revenue: 95, eps: 0.9 },
          ],
        },
      ]),
    );

    const quarters = await fetchQuarters();

    expect(quarters).toEqual([
      { label: 'Q1 2025', revenue: 130, eps: 1.3 },
      { label: 'Q1 2024', revenue: 95, eps: 0.9 },
    ]);
  });

  it('should keep quarters with EPS but no reported revenue', async () => {
    mockSec(
      companyFacts(
        calendarYear2024.map((filing) => ({
          ...filing,
          periods: filing.periods.map((period) => ({
            ...period,
            revenue: undefined,
          })),
        })),
      ),
    );

    const quarters = await fetchQuarters();

    expect(quarters.map((q) => q.label)).toEqual([
      'Q4 2024',
      'Q3 2024',
      'Q2 2024',
      'Q1 2024',
    ]);
    expect(quarters.every((q) => q.revenue === null)).toBe(true);
    expect(quarters[0].eps).toBeCloseTo(1.3);
  });

  it('should fall back to the next revenue concept in priority order', async () => {
    mockSec(companyFacts(calendarYear2024, 'SalesRevenueNet'));

    const quarters = await fetchQuarters();

    expect(quarters).toHaveLength(4);
  });

  it('should normalise exchange prefixes and share-class dots to SEC tickers', async () => {
    mockSec(companyFacts(calendarYear2024));

    await service.getIncomeStatementHistory(Symbol.of('NYSE:BRK.B'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://data.sec.gov/api/xbrl/companyfacts/CIK0001067983.json',
      expect.anything(),
    );
  });

  it('should return no statements for a ticker SEC does not know', async () => {
    mockSec(companyFacts(calendarYear2024));

    expect(await fetchQuarters('TSM')).toEqual([]);
  });

  it('should return no statements when SEC has no company facts', async () => {
    mockSec(undefined, 404);

    expect(await fetchQuarters()).toEqual([]);
  });

  describe('annual financials', () => {
    interface AnnualFilingInput {
      fiscalYear: number;
      form?: string;
      unit?: string;
      eps: Record<number, number>;
      netIncome?: number;
      equity?: number;
    }

    function annualFacts(filings: AnnualFilingInput[]) {
      const epsByUnit: Record<string, unknown[]> = {};
      const netIncome: unknown[] = [];
      const equity: unknown[] = [];
      for (const filing of filings) {
        const base = {
          accn: `k-${filing.fiscalYear}`,
          fy: filing.fiscalYear,
          fp: 'FY',
          form: filing.form ?? '10-K',
          filed: `${filing.fiscalYear + 1}-02-15`,
        };
        const yearEnd = `${filing.fiscalYear}-12-31`;
        const unit = filing.unit ?? 'USD/shares';
        for (const [year, val] of Object.entries(filing.eps)) {
          (epsByUnit[unit] ??= []).push({
            ...base,
            start: `${year}-01-01`,
            end: `${year}-12-31`,
            val,
          });
        }
        if (filing.netIncome != null) {
          netIncome.push({
            ...base,
            start: `${filing.fiscalYear}-01-01`,
            end: yearEnd,
            val: filing.netIncome,
          });
        }
        if (filing.equity != null) {
          equity.push({ ...base, end: yearEnd, val: filing.equity });
        }
      }
      return {
        facts: {
          'us-gaap': {
            EarningsPerShareDiluted: { units: epsByUnit },
            NetIncomeLoss: { units: { USD: netIncome } },
            StockholdersEquity: { units: { USD: equity } },
          },
        },
      };
    }

    const fetchYears = (limit?: number) =>
      service.getAnnualFinancialsHistory(Symbol.of('TEST'), { limit });

    it('should return fiscal years newest first with net income and year-end equity', async () => {
      mockSec(
        annualFacts([
          { fiscalYear: 2023, eps: { 2023: 2 }, netIncome: 200, equity: 1000 },
          {
            fiscalYear: 2024,
            eps: { 2024: 3, 2023: 2 },
            netIncome: 300,
            equity: 1200,
          },
        ]),
      );

      const years = await fetchYears();

      expect(years.map((y) => ({ ...y }))).toEqual([
        {
          symbol: 'TEST',
          fiscalYear: '2024',
          eps: 3,
          comparableEps: { current: 3, previous: 2 },
          netIncome: 300,
          stockholdersEquity: 1200,
        },
        {
          symbol: 'TEST',
          fiscalYear: '2023',
          eps: 2,
          comparableEps: null,
          netIncome: 200,
          stockholdersEquity: 1000,
        },
      ]);
    });

    it('should pair EPS from the same filing so a stock split does not mix share bases', async () => {
      mockSec(
        annualFacts([
          { fiscalYear: 2022, eps: { 2022: 40 } },
          { fiscalYear: 2023, eps: { 2023: 20, 2022: 40 } },
          { fiscalYear: 2024, eps: { 2024: 3, 2023: 2 } },
        ]),
      );

      const years = await fetchYears();

      expect(years.map((y) => [y.fiscalYear, y.comparableEps])).toEqual([
        ['2024', { current: 3, previous: 2 }],
        ['2023', { current: 20, previous: 40 }],
        ['2022', null],
      ]);
    });

    it('should only pair a fiscal year with the one immediately before it', async () => {
      mockSec(annualFacts([{ fiscalYear: 2024, eps: { 2024: 3, 2022: 1 } }]));

      const [latest] = await fetchYears();

      expect(latest.comparableEps).toBeNull();
    });

    it('should fall back to another currency for the comparable pair of a 20-F filer', async () => {
      const facts = annualFacts([
        { fiscalYear: 2025, form: '20-F', eps: { 2025: -0.59 } },
        {
          fiscalYear: 2025,
          form: '20-F',
          unit: 'HKD/shares',
          eps: { 2025: -4.61, 2024: -5.99 },
        },
      ]);
      mockSec(facts);

      const years = await fetchYears();

      expect(years.map((y) => ({ ...y }))).toEqual([
        expect.objectContaining({
          fiscalYear: '2025',
          eps: -0.59,
          comparableEps: { current: -4.61, previous: -5.99 },
        }),
      ]);
    });

    it('should ignore quarterly periods', async () => {
      mockSec(companyFacts(calendarYear2024));

      const years = await fetchYears();

      expect(years.map((y) => [y.fiscalYear, y.eps])).toEqual([['2024', 4.6]]);
      expect(years[0].netIncome).toBeNull();
      expect(years[0].stockholdersEquity).toBeNull();
    });

    it('should cap the history at the requested number of years', async () => {
      mockSec(
        annualFacts(
          [2020, 2021, 2022, 2023, 2024].map((year) => ({
            fiscalYear: year,
            eps: { [year]: 1 },
          })),
        ),
      );

      const years = await fetchYears(3);

      expect(years.map((y) => y.fiscalYear)).toEqual(['2024', '2023', '2022']);
    });

    it('should share one companyfacts download between concurrent requests', async () => {
      mockSec(companyFacts(calendarYear2024));

      await Promise.all([
        service.getIncomeStatementHistory(Symbol.of('TEST')),
        service.getAnnualFinancialsHistory(Symbol.of('TEST')),
      ]);

      const companyFactsCalls = fetchMock.mock.calls.filter(([url]) =>
        (url as string).includes('companyfacts'),
      );
      expect(companyFactsCalls).toHaveLength(1);
    });
  });

  it('should re-request company_tickers.json after a timeout instead of caching the failure', async () => {
    mockSec(companyFacts(calendarYear2024));
    const succeed = fetchMock.getMockImplementation() as typeof fetch;
    const timeout = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    });
    fetchMock.mockRejectedValueOnce(timeout);

    await expect(fetchQuarters()).rejects.toThrow('timed out');
    fetchMock.mockImplementation(succeed);

    await expect(fetchQuarters()).resolves.not.toHaveLength(0);
    const tickerCalls = fetchMock.mock.calls.filter(([url]) =>
      (url as string).endsWith('company_tickers.json'),
    );
    expect(tickerCalls).toHaveLength(2);
  });

  describe('stock splits', () => {
    const epsByLabel = async () =>
      Object.fromEntries(
        (await fetchQuarters()).map((q) => [q.label, q.eps] as const),
      );

    it('should express quarters before a split on the post-split share basis', async () => {
      mockSec(epsFacts(nvidiaAcrossTenForOneSplit));

      const eps = await epsByLabel();

      expect(eps['Q4 2024']).toBeCloseTo(0.488, 3);
      expect(eps['Q1 2024']).toBeCloseTo(0.082, 3);
      expect(eps['Q4 2025']).toBeCloseTo(0.89, 3);
    });

    it('should not let an earlier unrelated restatement pull the split boundary forward', async () => {
      mockSec(
        epsFacts([
          ...nvidiaAcrossTenForOneSplit,
          ['2022-10-31', '2023-01-29', 0.4, '2023-02-24', 2023, 'Q4'],
          ['2022-10-31', '2023-01-29', 0.2, '2024-02-21', 2024, 'FY'],
        ]),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2024']).toBeCloseTo(0.082, 3);
      expect(eps['Q4 2024']).toBeCloseTo(0.488, 3);
    });

    it('should still detect a split when a stray single-period restatement wins the vote first', async () => {
      mockSec(
        epsFacts([
          ['2022-07-01', '2022-09-30', 0.4, '2022-11-01', 2022, 'Q3'],
          ['2023-01-01', '2023-03-31', 1, '2023-05-01', 2023, 'Q1'],
          ['2023-04-01', '2023-06-30', 2.5, '2023-08-28', 2023, 'Q2'],
          ['2022-07-01', '2022-09-30', 0.2, '2023-10-01', 2023, 'Q3'],
          ['2023-07-01', '2023-09-30', 3.7, '2023-11-21', 2023, 'Q3'],
          ['2024-04-01', '2024-06-30', 0.3, '2024-08-28', 2024, 'Q2'],
          ['2023-04-01', '2023-06-30', 0.25, '2024-08-28', 2024, 'Q2'],
          ['2024-07-01', '2024-09-30', 0.4, '2024-11-20', 2024, 'Q3'],
          ['2023-07-01', '2023-09-30', 0.37, '2024-11-20', 2024, 'Q3'],
        ]),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2023']).toBeCloseTo(0.1, 6);
    });

    it('should compute year-over-year growth against split-adjusted quarters', async () => {
      mockSec(epsFacts(nvidiaAcrossTenForOneSplit));
      const computeReport = new ComputeFinancialReportUseCase(service);

      const { report } = await computeReport.execute({
        symbol: Symbol.of('TEST'),
      });

      const growth = (label: string) =>
        report.quarterlyGrowths.find((q) => `${q.quarter} ${q.year}` === label)
          ?.epsGrowthPercent;
      expect(growth('Q1 2025')).toBeCloseTo(((0.6 - 0.082) / 0.082) * 100, 1);
      expect(growth('Q4 2025')).toBeCloseTo(((0.89 - 0.488) / 0.488) * 100, 1);
    });

    it('should divide a quarter filed before two splits by both factors exactly once', async () => {
      mockSec(
        epsFacts([
          ['2020-01-01', '2020-03-31', 8, '2020-05-01', 2020, 'Q1'],
          ['2020-04-01', '2020-06-30', 4, '2020-08-01', 2020, 'Q2'],
          ['2020-07-01', '2020-09-30', 6, '2020-11-01', 2020, 'Q3'],
          ['2021-04-01', '2021-06-30', 2, '2021-08-20', 2021, 'Q2'],
          ['2020-04-01', '2020-06-30', 1, '2021-08-20', 2021, 'Q2'],
          ['2021-07-01', '2021-09-30', 2.4, '2021-11-01', 2021, 'Q3'],
          ['2020-07-01', '2020-09-30', 1.5, '2021-11-01', 2021, 'Q3'],
          ['2023-04-01', '2023-06-30', 5, '2023-08-01', 2023, 'Q2'],
          ['2023-07-01', '2023-09-30', 6, '2023-11-01', 2023, 'Q3'],
          ['2024-04-01', '2024-06-30', 0.7, '2024-08-28', 2024, 'Q2'],
          ['2023-04-01', '2023-06-30', 0.5, '2024-08-28', 2024, 'Q2'],
          ['2024-07-01', '2024-09-30', 0.8, '2024-11-01', 2024, 'Q3'],
          ['2023-07-01', '2023-09-30', 0.6, '2024-11-01', 2024, 'Q3'],
        ]),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2020']).toBeCloseTo(0.2, 6);
      expect(eps['Q2 2020']).toBeCloseTo(0.1, 6);
      expect(eps['Q3 2020']).toBeCloseTo(0.15, 6);
      expect(eps['Q2 2021']).toBeCloseTo(0.2, 6);
      expect(eps['Q2 2023']).toBeCloseTo(0.5, 6);
      expect(eps['Q2 2024']).toBeCloseTo(0.7, 6);
    });

    it('should keep one split when rounded cents make some restatements read 49× instead of 50×', async () => {
      mockSec(
        epsFacts([
          ['2023-01-01', '2023-03-31', 10, '2023-04-25', 2023, 'Q1'],
          ['2023-04-01', '2023-06-30', 4.9, '2023-07-25', 2023, 'Q2'],
          ['2023-01-01', '2023-06-30', 15, '2023-07-25', 2023, 'Q2'],
          ['2023-07-01', '2023-09-30', 4.9, '2023-10-25', 2023, 'Q3'],
          ['2023-01-01', '2023-09-30', 20, '2023-10-25', 2023, 'Q3'],
          ['2023-01-01', '2023-12-31', 25, '2024-02-05', 2023, 'FY'],
          ['2024-04-01', '2024-06-30', 0.12, '2024-07-25', 2024, 'Q2'],
          ['2023-04-01', '2023-06-30', 0.1, '2024-07-25', 2024, 'Q2'],
          ['2023-01-01', '2023-06-30', 0.3, '2024-07-25', 2024, 'Q2'],
          ['2024-07-01', '2024-09-30', 0.13, '2024-10-25', 2024, 'Q3'],
          ['2023-07-01', '2023-09-30', 0.1, '2024-10-25', 2024, 'Q3'],
          ['2023-01-01', '2023-09-30', 0.4, '2024-10-25', 2024, 'Q3'],
          ['2024-01-01', '2024-12-31', 0.6, '2025-02-05', 2024, 'FY'],
          ['2023-01-01', '2023-12-31', 0.5, '2025-02-05', 2024, 'FY'],
        ]),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2023']).toBeCloseTo(0.2, 6);
      expect(eps['Q2 2024']).toBe(0.12);
    });

    it('should scale quarters up across a reverse split', async () => {
      mockSec(
        epsFacts([
          ['2024-01-01', '2024-03-31', 0.3, '2024-05-01', 2024, 'Q1'],
          ['2024-04-01', '2024-06-30', 0.2, '2024-08-01', 2024, 'Q2'],
          ['2024-07-01', '2024-09-30', 0.4, '2024-11-01', 2024, 'Q3'],
          ['2025-04-01', '2025-06-30', 1.1, '2025-08-01', 2025, 'Q2'],
          ['2024-04-01', '2024-06-30', 1, '2025-08-01', 2025, 'Q2'],
          ['2025-07-01', '2025-09-30', 2.2, '2025-11-01', 2025, 'Q3'],
          ['2024-07-01', '2024-09-30', 2, '2025-11-01', 2025, 'Q3'],
        ]),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2024']).toBeCloseTo(1.5, 6);
      expect(eps['Q2 2024']).toBe(1);
    });

    const original: EpsRow = [
      '2024-01-01',
      '2024-03-31',
      1,
      '2024-05-01',
      2024,
      'Q1',
    ];
    const restatement = (from: number, to: number): EpsRow[] => [
      ['2024-04-01', '2024-06-30', from, '2024-08-01', 2024, 'Q2'],
      ['2025-04-01', '2025-06-30', 0.05, '2025-08-01', 2025, 'Q2'],
      ['2024-04-01', '2024-06-30', to, '2025-08-01', 2025, 'Q2'],
    ];
    const secondTinyRestatement: EpsRow[] = [
      ['2024-07-01', '2024-09-30', 0.02, '2024-11-01', 2024, 'Q3'],
      ['2025-07-01', '2025-09-30', 0.05, '2025-11-01', 2025, 'Q3'],
      ['2024-07-01', '2024-09-30', 0.04, '2025-11-01', 2025, 'Q3'],
    ];

    it.each<[string, EpsRow[], EpsRow[]]>([
      ['one diluted 0.01 → 0.02 restatement', restatement(0.01, 0.02), []],
      [
        'basic and diluted restating the same quarter 0.01 → 0.02',
        restatement(0.01, 0.02),
        restatement(0.01, 0.02),
      ],
      [
        'basic and diluted restating the same quarter 0.50 → 0.25',
        restatement(0.5, 0.25),
        restatement(0.5, 0.25),
      ],
      [
        'two filings on the same day disagreeing by 10×',
        [
          ['2024-04-01', '2024-06-30', 5, '2024-08-01', 2024, 'Q2'],
          ['2024-04-01', '2024-06-30', 0.5, '2024-08-01', 2024, 'Q2'],
          ['2024-07-01', '2024-09-30', 6, '2024-11-01', 2024, 'Q3'],
          ['2024-07-01', '2024-09-30', 0.6, '2024-11-01', 2024, 'Q3'],
        ],
        [],
      ],
      [
        'two quarters restated by integer ratios below $0.10',
        [...restatement(0.01, 0.02), ...secondTinyRestatement],
        [],
      ],
    ])('should not treat %s as a split', async (_, diluted, basic) => {
      mockSec(epsFacts([original, ...diluted], [original, ...basic]));

      const eps = await epsByLabel();

      expect(eps['Q1 2024']).toBe(1);
    });

    it('should not pair basic with diluted EPS when detecting splits', async () => {
      mockSec(
        epsFacts(
          [
            original,
            ['2025-04-01', '2025-06-30', 0.5, '2025-08-01', 2025, 'Q2'],
            ['2024-04-01', '2024-06-30', 0.5, '2025-08-01', 2025, 'Q2'],
            ['2025-07-01', '2025-09-30', 0.6, '2025-11-01', 2025, 'Q3'],
            ['2024-07-01', '2024-09-30', 0.6, '2025-11-01', 2025, 'Q3'],
          ],
          [
            ['2024-04-01', '2024-06-30', 1, '2024-08-01', 2024, 'Q2'],
            ['2024-07-01', '2024-09-30', 1.2, '2024-11-01', 2024, 'Q3'],
          ],
        ),
      );

      const eps = await epsByLabel();

      expect(eps['Q1 2024']).toBe(1);
    });
  });

  it('should throw when SEC responds with an error', async () => {
    mockSec(undefined, 503);

    await expect(fetchQuarters()).rejects.toThrow('HTTP 503');
  });
});
