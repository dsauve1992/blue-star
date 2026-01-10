export class IncomeStatement {
  private constructor(
    public readonly date: string,
    public readonly symbol: string,
    public readonly reportedCurrency: string,
    public readonly cik: string,
    public readonly filingDate: string,
    public readonly acceptedDate: string,
    public readonly fiscalYear: string,
    public readonly period: string,
    public readonly revenue: number,
    public readonly costOfRevenue: number,
    public readonly grossProfit: number,
    public readonly researchAndDevelopmentExpenses: number,
    public readonly generalAndAdministrativeExpenses: number,
    public readonly sellingAndMarketingExpenses: number,
    public readonly sellingGeneralAndAdministrativeExpenses: number,
    public readonly otherExpenses: number,
    public readonly operatingExpenses: number,
    public readonly costAndExpenses: number,
    public readonly netInterestIncome: number,
    public readonly interestIncome: number,
    public readonly interestExpense: number,
    public readonly depreciationAndAmortization: number,
    public readonly ebitda: number,
    public readonly ebit: number,
    public readonly nonOperatingIncomeExcludingInterest: number,
    public readonly operatingIncome: number,
    public readonly totalOtherIncomeExpensesNet: number,
    public readonly incomeBeforeTax: number,
    public readonly incomeTaxExpense: number,
    public readonly netIncomeFromContinuingOperations: number,
    public readonly netIncomeFromDiscontinuedOperations: number,
    public readonly otherAdjustmentsToNetIncome: number,
    public readonly netIncome: number,
    public readonly netIncomeDeductions: number,
    public readonly bottomLineNetIncome: number,
    public readonly eps: number,
    public readonly epsDiluted: number,
    public readonly weightedAverageShsOut: number,
    public readonly weightedAverageShsOutDil: number,
  ) {}

  static of(data: {
    date: string;
    symbol: string;
    reportedCurrency: string;
    cik: string;
    filingDate: string;
    acceptedDate: string;
    fiscalYear: string;
    period: string;
    revenue: number;
    costOfRevenue: number;
    grossProfit: number;
    researchAndDevelopmentExpenses: number;
    generalAndAdministrativeExpenses: number;
    sellingAndMarketingExpenses: number;
    sellingGeneralAndAdministrativeExpenses: number;
    otherExpenses: number;
    operatingExpenses: number;
    costAndExpenses: number;
    netInterestIncome: number;
    interestIncome: number;
    interestExpense: number;
    depreciationAndAmortization: number;
    ebitda: number;
    ebit: number;
    nonOperatingIncomeExcludingInterest: number;
    operatingIncome: number;
    totalOtherIncomeExpensesNet: number;
    incomeBeforeTax: number;
    incomeTaxExpense: number;
    netIncomeFromContinuingOperations: number;
    netIncomeFromDiscontinuedOperations: number;
    otherAdjustmentsToNetIncome: number;
    netIncome: number;
    netIncomeDeductions: number;
    bottomLineNetIncome: number;
    eps: number;
    epsDiluted: number;
    weightedAverageShsOut: number;
    weightedAverageShsOutDil: number;
  }): IncomeStatement {
    return new IncomeStatement(
      data.date,
      data.symbol,
      data.reportedCurrency,
      data.cik,
      data.filingDate,
      data.acceptedDate,
      data.fiscalYear,
      data.period,
      data.revenue,
      data.costOfRevenue,
      data.grossProfit,
      data.researchAndDevelopmentExpenses,
      data.generalAndAdministrativeExpenses,
      data.sellingAndMarketingExpenses,
      data.sellingGeneralAndAdministrativeExpenses,
      data.otherExpenses,
      data.operatingExpenses,
      data.costAndExpenses,
      data.netInterestIncome,
      data.interestIncome,
      data.interestExpense,
      data.depreciationAndAmortization,
      data.ebitda,
      data.ebit,
      data.nonOperatingIncomeExcludingInterest,
      data.operatingIncome,
      data.totalOtherIncomeExpensesNet,
      data.incomeBeforeTax,
      data.incomeTaxExpense,
      data.netIncomeFromContinuingOperations,
      data.netIncomeFromDiscontinuedOperations,
      data.otherAdjustmentsToNetIncome,
      data.netIncome,
      data.netIncomeDeductions,
      data.bottomLineNetIncome,
      data.eps,
      data.epsDiluted,
      data.weightedAverageShsOut,
      data.weightedAverageShsOutDil,
    );
  }
}
