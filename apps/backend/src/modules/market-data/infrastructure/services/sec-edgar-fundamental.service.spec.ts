import { ConfigService } from '@nestjs/config';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { SecEdgarFundamentalService } from './sec-edgar-fundamental.service';

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
      { headers: { 'User-Agent': 'BlueStar test@example.com' } },
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

  it('should throw when SEC responds with an error', async () => {
    mockSec(undefined, 503);

    await expect(fetchQuarters()).rejects.toThrow('HTTP 503');
  });
});
