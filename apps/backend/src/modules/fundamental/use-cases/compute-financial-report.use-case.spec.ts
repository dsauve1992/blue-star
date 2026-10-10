import { ComputeFinancialReportUseCase } from './compute-financial-report.use-case';
import { FundamentalService } from '../domain/services/fundamental.service';
import { IncomeStatement } from '../domain/value-objects/income-statement';
import { AnnualFinancials } from '../domain/value-objects/annual-financials';
import { Symbol } from '../../../shared/value-objects/symbol';

const statement = (
  fiscalYear: string,
  period: string,
  eps: number,
  revenue: number | null = 100,
) => IncomeStatement.of({ symbol: 'AAPL', fiscalYear, period, eps, revenue });

const annual = (
  fiscalYear: string,
  eps: number,
  options: {
    comparableEps?: { current: number; previous: number };
    netIncome?: number | null;
    stockholdersEquity?: number | null;
  } = {},
) =>
  AnnualFinancials.of({
    symbol: 'AAPL',
    fiscalYear,
    eps,
    comparableEps: options.comparableEps ?? null,
    netIncome: options.netIncome ?? null,
    stockholdersEquity: options.stockholdersEquity ?? null,
  });

describe('ComputeFinancialReportUseCase', () => {
  let getIncomeStatementHistory: jest.Mock;
  let getAnnualFinancialsHistory: jest.Mock;
  let useCase: ComputeFinancialReportUseCase;

  const run = async (statements: IncomeStatement[]) => {
    getIncomeStatementHistory.mockResolvedValue(statements);
    const { report } = await useCase.execute({ symbol: Symbol.of('AAPL') });
    return report.quarterlyGrowths;
  };

  beforeEach(() => {
    getIncomeStatementHistory = jest.fn();
    getAnnualFinancialsHistory = jest.fn().mockResolvedValue([]);
    useCase = new ComputeFinancialReportUseCase({
      getIncomeStatementHistory,
      getAnnualFinancialsHistory,
    } as unknown as FundamentalService);
  });

  it('computes growth against a positive base', async () => {
    const [latest] = await run([
      statement('2024', 'Q1', 1.5, 200),
      statement('2023', 'Q1', 1, 100),
    ]);

    expect(latest.epsGrowthPercent).toBeCloseTo(50);
    expect(latest.revenueGrowthPercent).toBeCloseTo(100);
  });

  it('reports positive growth when EPS turns from negative to positive', async () => {
    const [latest] = await run([
      statement('2024', 'Q1', 0.5),
      statement('2023', 'Q1', -1),
    ]);

    expect(latest.epsGrowthPercent).toBeCloseTo(150);
  });

  it('reports positive growth when a loss shrinks', async () => {
    const [latest] = await run([
      statement('2024', 'Q1', -0.5),
      statement('2023', 'Q1', -1),
    ]);

    expect(latest.epsGrowthPercent).toBeCloseTo(50);
  });

  it('reports negative growth when a loss widens', async () => {
    const [latest] = await run([
      statement('2024', 'Q1', -2),
      statement('2023', 'Q1', -1),
    ]);

    expect(latest.epsGrowthPercent).toBeCloseTo(-100);
  });

  it('handles a zero base', async () => {
    const growths = await run([
      statement('2024', 'Q1', 1),
      statement('2024', 'Q2', -1),
      statement('2024', 'Q3', 0),
      statement('2023', 'Q1', 0),
      statement('2023', 'Q2', 0),
      statement('2023', 'Q3', 0),
    ]);

    const byQuarter = Object.fromEntries(
      growths
        .filter((g) => g.year === '2024')
        .map((g) => [g.quarter, g.epsGrowthPercent]),
    );
    expect(byQuarter).toEqual({ Q1: 100, Q2: 0, Q3: 0 });
  });

  it('returns null growth when the prior-year quarter is missing', async () => {
    const [latest] = await run([statement('2024', 'Q1', 1)]);

    expect(latest.epsGrowthPercent).toBeNull();
    expect(latest.revenueGrowthPercent).toBeNull();
  });

  it('returns null revenue growth when either quarter has no revenue', async () => {
    const [latest, previous] = await run([
      statement('2024', 'Q1', -0.5, null),
      statement('2023', 'Q1', -1, null),
    ]);

    expect(latest.revenue).toBeNull();
    expect(latest.revenueGrowthPercent).toBeNull();
    expect(latest.epsGrowthPercent).toBeCloseTo(50);
    expect(previous.revenue).toBeNull();
  });

  it('orders newest first and ignores non-quarterly periods', async () => {
    const growths = await run([
      statement('2023', 'Q4', 1),
      statement('2024', 'Q1', 1),
      statement('2024', 'FY', 1),
      statement('2023', 'Q2', 1),
    ]);

    expect(growths.map((g) => `${g.quarter}-${g.year}`)).toEqual([
      'Q1-2024',
      'Q4-2023',
      'Q2-2023',
    ]);
  });

  it('caps the report at 8 quarters', async () => {
    const statements = ['2021', '2022', '2023', '2024'].flatMap((year) =>
      ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => statement(year, quarter, 1)),
    );

    expect(await run(statements)).toHaveLength(8);
  });

  describe('annual growth', () => {
    const runAnnual = async (years: AnnualFinancials[]) => {
      getIncomeStatementHistory.mockResolvedValue([]);
      getAnnualFinancialsHistory.mockResolvedValue(years);
      const { report } = await useCase.execute({ symbol: Symbol.of('AAPL') });
      return report.annualGrowths;
    };

    it('computes EPS growth from the comparable pair, not from the neighbouring year', async () => {
      const growths = await runAnnual([
        annual('2023', 20),
        annual('2024', 3, { comparableEps: { current: 3, previous: 2 } }),
      ]);

      expect(growths.map((g) => [g.year, g.eps, g.epsGrowthPercent])).toEqual([
        ['2024', 3, 50],
        ['2023', 20, null],
      ]);
    });

    it('reports positive growth when a loss narrows', async () => {
      const [latest] = await runAnnual([
        annual('2025', -0.59, {
          comparableEps: { current: -4.61, previous: -5.99 },
        }),
      ]);

      expect(latest.epsGrowthPercent).toBeCloseTo(23.04, 1);
    });

    it('computes return on equity from net income and year-end equity', async () => {
      const [latest] = await runAnnual([
        annual('2024', 3, { netIncome: 170, stockholdersEquity: 1000 }),
      ]);

      expect(latest.returnOnEquityPercent).toBeCloseTo(17);
    });

    it('returns null return on equity when equity is missing or not positive', async () => {
      const growths = await runAnnual([
        annual('2024', 1, { netIncome: 100 }),
        annual('2023', 1, { netIncome: 100, stockholdersEquity: -50 }),
        annual('2022', 1, { stockholdersEquity: 1000 }),
      ]);

      expect(growths.map((g) => g.returnOnEquityPercent)).toEqual([
        null,
        null,
        null,
      ]);
    });

    it('requests the last four fiscal years', async () => {
      await runAnnual([]);

      expect(getAnnualFinancialsHistory).toHaveBeenCalledWith(
        Symbol.of('AAPL'),
        { limit: 4 },
      );
    });
  });
});
