import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FundamentalService,
  GetIncomeStatementHistoryOptions,
} from '../../domain/services/fundamental.service';
import { Symbol } from '../../domain/value-objects/symbol';
import { IncomeStatement } from '../../domain/value-objects/income-statement';

interface FinancialModelingPrepIncomeStatementResponse {
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
}

@Injectable()
export class FinancialModelingPrepFundamentalService
  implements FundamentalService
{
  private readonly baseUrl = 'https://financialmodelingprep.com/stable';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'FINANCIAL_MODELING_PREP_API_KEY',
    );
    if (!apiKey) {
      throw new Error('FINANCIAL_MODELING_PREP_API_KEY is required');
    }

    this.apiKey = apiKey;
  }

  async getIncomeStatementHistory(
    symbol: Symbol,
    options?: GetIncomeStatementHistoryOptions,
  ): Promise<IncomeStatement[]> {
    const period = options?.period ?? 'quarter';
    const limit = options?.limit ?? 5;

    const url = new URL(`${this.baseUrl}/income-statement`);
    url.searchParams.append('symbol', symbol.value);
    url.searchParams.append('period', period);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('apikey', this.apiKey);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FinancialModelingPrepIncomeStatementResponse[] =
        (await response.json()) as FinancialModelingPrepIncomeStatementResponse[];

      return data.map((item) =>
        IncomeStatement.of({
          date: item.date,
          symbol: item.symbol,
          reportedCurrency: item.reportedCurrency,
          cik: item.cik,
          filingDate: item.filingDate,
          acceptedDate: item.acceptedDate,
          fiscalYear: item.fiscalYear,
          period: item.period,
          revenue: item.revenue,
          costOfRevenue: item.costOfRevenue,
          grossProfit: item.grossProfit,
          researchAndDevelopmentExpenses: item.researchAndDevelopmentExpenses,
          generalAndAdministrativeExpenses:
            item.generalAndAdministrativeExpenses,
          sellingAndMarketingExpenses: item.sellingAndMarketingExpenses,
          sellingGeneralAndAdministrativeExpenses:
            item.sellingGeneralAndAdministrativeExpenses,
          otherExpenses: item.otherExpenses,
          operatingExpenses: item.operatingExpenses,
          costAndExpenses: item.costAndExpenses,
          netInterestIncome: item.netInterestIncome,
          interestIncome: item.interestIncome,
          interestExpense: item.interestExpense,
          depreciationAndAmortization: item.depreciationAndAmortization,
          ebitda: item.ebitda,
          ebit: item.ebit,
          nonOperatingIncomeExcludingInterest:
            item.nonOperatingIncomeExcludingInterest,
          operatingIncome: item.operatingIncome,
          totalOtherIncomeExpensesNet: item.totalOtherIncomeExpensesNet,
          incomeBeforeTax: item.incomeBeforeTax,
          incomeTaxExpense: item.incomeTaxExpense,
          netIncomeFromContinuingOperations:
            item.netIncomeFromContinuingOperations,
          netIncomeFromDiscontinuedOperations:
            item.netIncomeFromDiscontinuedOperations,
          otherAdjustmentsToNetIncome: item.otherAdjustmentsToNetIncome,
          netIncome: item.netIncome,
          netIncomeDeductions: item.netIncomeDeductions,
          bottomLineNetIncome: item.bottomLineNetIncome,
          eps: item.eps,
          epsDiluted: item.epsDiluted,
          weightedAverageShsOut: item.weightedAverageShsOut,
          weightedAverageShsOutDil: item.weightedAverageShsOutDil,
        }),
      );
    } catch (error) {
      throw new Error(`Failed to fetch income statement data: ${error}`);
    }
  }
}
