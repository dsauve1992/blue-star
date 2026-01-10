import { Symbol } from '../value-objects/symbol';
import { IncomeStatement } from '../value-objects/income-statement';

export type IncomeStatementPeriod =
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'FY'
  | 'annual'
  | 'quarter';

export interface GetIncomeStatementHistoryOptions {
  period?: IncomeStatementPeriod;
  limit?: number;
}

export interface FundamentalService {
  getIncomeStatementHistory(
    symbol: Symbol,
    options?: GetIncomeStatementHistoryOptions,
  ): Promise<IncomeStatement[]>;
}
