import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FundamentalService,
  GetIncomeStatementHistoryOptions,
} from '../../domain/services/fundamental.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
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
  filedDate: string;
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

interface EmittedQuarter {
  row: FinnhubFinancialsRow;
  revenue: number;
  eps: number;
}

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
    const quarterly = this.dedupeByPeriod(
      rows.filter((row) => row.form?.startsWith('10-Q')),
    );

    const byFiscalYearStart = new Map<string, FinnhubFinancialsRow[]>();
    for (const row of quarterly) {
      if (!byFiscalYearStart.has(row.startDate))
        byFiscalYearStart.set(row.startDate, []);
      byFiscalYearStart.get(row.startDate)!.push(row);
    }

    const emitted: EmittedQuarter[] = [];
    for (const groupRows of byFiscalYearStart.values()) {
      groupRows.sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
      );

      let prev: { endDate: string; revenueYtd: number; epsYtd: number } | null =
        null;

      for (const row of groupRows) {
        const revenueYtd = this.findValue(row.report.ic, REVENUE_CONCEPTS);
        const epsYtd = this.findValue(row.report.ic, EPS_CONCEPTS);

        if (revenueYtd == null || epsYtd == null) {
          this.logger.debug(
            `Skipping ${symbolForLog} ${row.year} Q${row.quarter}: missing revenue or EPS concepts`,
          );
          prev = null;
          continue;
        }

        if (this.isQuarterSpan(row.startDate, row.endDate)) {
          emitted.push({ row, revenue: revenueYtd, eps: epsYtd });
        } else if (prev && this.isQuarterSpan(prev.endDate, row.endDate)) {
          emitted.push({
            row,
            revenue: revenueYtd - prev.revenueYtd,
            eps: epsYtd - prev.epsYtd,
          });
        } else {
          this.logger.debug(
            `Skipping ${symbolForLog} ${row.year} Q${row.quarter}: no preceding quarter to subtract from YTD`,
          );
        }

        prev = { endDate: row.endDate, revenueYtd, epsYtd };
      }
    }

    emitted.sort(
      (a, b) =>
        new Date(a.row.endDate).getTime() - new Date(b.row.endDate).getTime(),
    );

    const result: IncomeStatement[] = [];
    let precedingFiscalYear: number | null = null;
    for (const { row, revenue, eps } of emitted) {
      let fiscalYear = row.year;
      if (
        row.quarter === 1 &&
        precedingFiscalYear != null &&
        fiscalYear <= precedingFiscalYear
      ) {
        fiscalYear = precedingFiscalYear + 1;
      }
      precedingFiscalYear = fiscalYear;

      result.push(
        IncomeStatement.of({
          symbol: row.symbol,
          fiscalYear: fiscalYear.toString(),
          period: `Q${row.quarter}`,
          revenue,
          eps,
        }),
      );
    }

    return result.sort((a, b) => {
      const yearCompare = b.fiscalYear.localeCompare(a.fiscalYear);
      if (yearCompare !== 0) return yearCompare;
      return b.period.localeCompare(a.period);
    });
  }

  private dedupeByPeriod(rows: FinnhubFinancialsRow[]): FinnhubFinancialsRow[] {
    const latestByPeriod = new Map<string, FinnhubFinancialsRow>();
    for (const row of rows) {
      const key = `${row.startDate}|${row.endDate}`;
      const existing = latestByPeriod.get(key);
      if (!existing || row.filedDate > existing.filedDate) {
        latestByPeriod.set(key, row);
      }
    }
    return [...latestByPeriod.values()];
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

  private isQuarterSpan(from: string, to: string): boolean {
    const days =
      (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY;
    return (
      days >= STANDALONE_QUARTER_MIN_DAYS && days <= STANDALONE_QUARTER_MAX_DAYS
    );
  }
}
