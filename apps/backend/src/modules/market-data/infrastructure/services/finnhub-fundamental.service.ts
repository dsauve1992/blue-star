import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FundamentalService,
  GetIncomeStatementHistoryOptions,
} from '../../domain/services/fundamental.service';
import { Symbol } from '../../domain/value-objects/symbol';
import { IncomeStatement } from '../../domain/value-objects/income-statement';

interface FinnhubReportLineItem {
  concept: string;
  value: number | string;
  unit?: string;
}

interface FinnhubReport {
  ic?: FinnhubReportLineItem[];
}

interface FinnhubFinancialsRow {
  symbol: string;
  year: number;
  quarter: number;
  form: string;
  startDate: string;
  endDate: string;
  report: FinnhubReport;
}

interface FinnhubFinancialsResponse {
  symbol: string;
  data: FinnhubFinancialsRow[];
}

const REVENUE_CONCEPTS = [
  'us-gaap_Revenues',
  'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
  'us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax',
  'us-gaap_SalesRevenueNet',
  'us-gaap_SalesRevenueGoodsNet',
];

const EPS_CONCEPTS = [
  'us-gaap_EarningsPerShareDiluted',
  'us-gaap_IncomeLossFromContinuingOperationsPerDilutedShare',
  'us-gaap_EarningsPerShareBasic',
];

const STANDALONE_QUARTER_MIN_DAYS = 80;
const STANDALONE_QUARTER_MAX_DAYS = 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class FinnhubFundamentalService implements FundamentalService {
  private readonly logger = new Logger(FinnhubFundamentalService.name);
  private readonly baseUrl = 'https://finnhub.io/api/v1';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('FINNHUB_API_KEY');
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  async getIncomeStatementHistory(
    symbol: Symbol,
    options?: GetIncomeStatementHistoryOptions,
  ): Promise<IncomeStatement[]> {
    const limit = options?.limit ?? 16;
    const tickerOnly = this.stripExchangePrefix(symbol.value);

    const url = new URL(`${this.baseUrl}/stock/financials-reported`);
    url.searchParams.append('symbol', tickerOnly);
    url.searchParams.append('freq', 'quarterly');
    url.searchParams.append('token', this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Finnhub financials-reported request failed for ${tickerOnly}: HTTP ${response.status}`,
      );
    }

    const json = (await response.json()) as FinnhubFinancialsResponse;
    const rows = json.data ?? [];

    const standalone = this.toStandaloneQuarters(rows, tickerOnly);
    return standalone.slice(0, limit);
  }

  private stripExchangePrefix(rawSymbol: string): string {
    return rawSymbol.includes(':') ? rawSymbol.split(':')[1] : rawSymbol;
  }

  private toStandaloneQuarters(
    rows: FinnhubFinancialsRow[],
    symbolForLog: string,
  ): IncomeStatement[] {
    const quarterly = rows.filter((row) => row.form?.startsWith('10-Q'));

    const byYear = new Map<number, FinnhubFinancialsRow[]>();
    for (const row of quarterly) {
      if (!byYear.has(row.year)) byYear.set(row.year, []);
      byYear.get(row.year)!.push(row);
    }

    const result: IncomeStatement[] = [];
    for (const [year, yearRows] of byYear) {
      yearRows.sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
      );

      let prevRevenueYtd: number | null = null;
      let prevEpsYtd: number | null = null;

      for (const row of yearRows) {
        const revenueYtd = this.findValue(row.report.ic, REVENUE_CONCEPTS);
        const epsYtd = this.findValue(row.report.ic, EPS_CONCEPTS);

        if (revenueYtd == null || epsYtd == null) {
          this.logger.debug(
            `Skipping ${symbolForLog} ${year} Q${row.quarter}: missing revenue or EPS concepts`,
          );
          continue;
        }

        const isStandalone = this.isStandaloneQuarterSpan(
          row.startDate,
          row.endDate,
        );
        const revenue = isStandalone
          ? revenueYtd
          : revenueYtd - (prevRevenueYtd ?? 0);
        const eps = isStandalone ? epsYtd : epsYtd - (prevEpsYtd ?? 0);

        result.push(
          IncomeStatement.of({
            symbol: row.symbol,
            fiscalYear: year.toString(),
            period: `Q${row.quarter}`,
            revenue,
            eps,
          }),
        );

        prevRevenueYtd = revenueYtd;
        prevEpsYtd = epsYtd;
      }
    }

    return result.sort((a, b) => {
      const yearCompare = b.fiscalYear.localeCompare(a.fiscalYear);
      if (yearCompare !== 0) return yearCompare;
      return b.period.localeCompare(a.period);
    });
  }

  private findValue(
    items: FinnhubReportLineItem[] | undefined,
    conceptPriority: string[],
  ): number | null {
    if (!items) return null;
    for (const concept of conceptPriority) {
      const match = items.find((item) => item.concept === concept);
      if (match != null) {
        const value =
          typeof match.value === 'string'
            ? parseFloat(match.value)
            : match.value;
        if (Number.isFinite(value)) return value;
      }
    }
    return null;
  }

  private isStandaloneQuarterSpan(startDate: string, endDate: string): boolean {
    const days =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      MS_PER_DAY;
    return (
      days >= STANDALONE_QUARTER_MIN_DAYS && days <= STANDALONE_QUARTER_MAX_DAYS
    );
  }
}
