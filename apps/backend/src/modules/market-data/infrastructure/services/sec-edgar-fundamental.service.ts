import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FundamentalService,
  GetIncomeStatementHistoryOptions,
} from '../../domain/services/fundamental.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { IncomeStatement } from '../../domain/value-objects/income-statement';

interface SecFact {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number | null;
  fp: string | null;
  form: string;
  filed: string;
}

interface SecConcept {
  units: Record<string, SecFact[]>;
}

interface SecCompanyFacts {
  facts?: { 'us-gaap'?: Record<string, SecConcept> };
}

interface SecTickerEntry {
  cik_str: number;
  ticker: string;
}

interface PeriodValue {
  start: string;
  end: string;
  value: number;
  filed: string;
  label: { fiscalYear: number; fiscalPeriod: string } | null;
}

interface Quarter {
  fiscalYear: number;
  quarter: number;
  end: string;
  revenue: number | null;
  eps: number;
}

const REVENUE_CONCEPTS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
  'SalesRevenueNet',
  'SalesRevenueGoodsNet',
];

const EPS_CONCEPTS = [
  'EarningsPerShareDiluted',
  'IncomeLossFromContinuingOperationsPerDilutedShare',
  'EarningsPerShareBasic',
];

const PERIODIC_FORMS = new Set(['10-Q', '10-Q/A', '10-K', '10-K/A']);
const QUARTER_MIN_DAYS = 80;
const QUARTER_MAX_DAYS = 100;
const YEAR_MIN_DAYS = 350;
const YEAR_MAX_DAYS = 380;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class SecEdgarFundamentalService implements FundamentalService {
  private readonly logger = new Logger(SecEdgarFundamentalService.name);
  private readonly userAgent: string;
  private cikByTicker: Promise<Map<string, string>> | null = null;

  constructor(private readonly configService: ConfigService) {
    const contactEmail = this.configService.get<string>(
      'SEC_EDGAR_CONTACT_EMAIL',
    );
    if (!contactEmail) {
      throw new Error('SEC_EDGAR_CONTACT_EMAIL is required');
    }
    this.userAgent = `BlueStar ${contactEmail}`;
  }

  async getIncomeStatementHistory(
    symbol: Symbol,
    options?: GetIncomeStatementHistoryOptions,
  ): Promise<IncomeStatement[]> {
    const limit = options?.limit ?? 16;
    const ticker = this.toSecTicker(symbol.value);

    const cik = (await this.loadCikByTicker()).get(ticker);
    if (!cik) {
      this.logger.debug(`No SEC CIK for ${ticker}`);
      return [];
    }

    const response = await this.secFetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
    );
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new Error(
        `SEC companyfacts request failed for ${ticker}: HTTP ${response.status}`,
      );
    }

    const companyFacts = (await response.json()) as SecCompanyFacts;
    const concepts = companyFacts.facts?.['us-gaap'] ?? {};
    const revenue = this.periodValues(concepts, REVENUE_CONCEPTS, 'USD');
    const eps = this.periodValues(concepts, EPS_CONCEPTS, 'USD/shares');

    return this.toQuarters(revenue, eps)
      .slice(0, limit)
      .map((quarter) =>
        IncomeStatement.of({
          symbol: ticker,
          fiscalYear: quarter.fiscalYear.toString(),
          period: `Q${quarter.quarter}`,
          revenue: quarter.revenue,
          eps: quarter.eps,
        }),
      );
  }

  private toSecTicker(rawSymbol: string): string {
    const ticker = rawSymbol.includes(':')
      ? rawSymbol.split(':')[1]
      : rawSymbol;
    return ticker.toUpperCase().replace('.', '-');
  }

  private loadCikByTicker(): Promise<Map<string, string>> {
    if (!this.cikByTicker) {
      this.cikByTicker = this.fetchCikByTicker().catch((error: unknown) => {
        this.cikByTicker = null;
        throw error;
      });
    }
    return this.cikByTicker;
  }

  private async fetchCikByTicker(): Promise<Map<string, string>> {
    const response = await this.secFetch(
      'https://www.sec.gov/files/company_tickers.json',
    );
    if (!response.ok) {
      throw new Error(
        `SEC company_tickers request failed: HTTP ${response.status}`,
      );
    }
    const entries = Object.values(
      (await response.json()) as Record<string, SecTickerEntry>,
    );
    return new Map(
      entries.map((entry) => [
        entry.ticker.toUpperCase(),
        entry.cik_str.toString().padStart(10, '0'),
      ]),
    );
  }

  private secFetch(url: string): Promise<Response> {
    return fetch(url, { headers: { 'User-Agent': this.userAgent } });
  }

  private periodValues(
    concepts: Record<string, SecConcept>,
    conceptPriority: string[],
    unit: string,
  ): Map<string, PeriodValue> {
    const merged = new Map<string, PeriodValue>();
    for (const concept of conceptPriority) {
      for (const [key, value] of this.conceptPeriodValues(
        concepts[concept]?.units[unit] ?? [],
      )) {
        if (!merged.has(key)) merged.set(key, value);
      }
    }
    return merged;
  }

  private conceptPeriodValues(facts: SecFact[]): Map<string, PeriodValue> {
    const periodic = facts.filter(
      (fact) => fact.start && PERIODIC_FORMS.has(fact.form),
    );

    const reportEndByFiling = new Map<string, string>();
    for (const fact of periodic) {
      const current = reportEndByFiling.get(fact.accn);
      if (!current || fact.end > current) {
        reportEndByFiling.set(fact.accn, fact.end);
      }
    }

    const byPeriod = new Map<string, PeriodValue>();
    for (const fact of periodic) {
      const key = `${fact.start}|${fact.end}`;
      const isCurrentPeriodOfFiling =
        reportEndByFiling.get(fact.accn) === fact.end &&
        fact.fy != null &&
        fact.fp != null;
      const existing = byPeriod.get(key);

      const label =
        isCurrentPeriodOfFiling &&
        (!existing?.label || fact.filed < existing.filed)
          ? { fiscalYear: fact.fy!, fiscalPeriod: fact.fp! }
          : (existing?.label ?? null);
      const isLatest = !existing || fact.filed >= existing.filed;

      byPeriod.set(key, {
        start: fact.start!,
        end: fact.end,
        value: isLatest ? fact.val : existing.value,
        filed: isLatest ? fact.filed : existing.filed,
        label,
      });
    }
    return byPeriod;
  }

  private toQuarters(
    revenue: Map<string, PeriodValue>,
    eps: Map<string, PeriodValue>,
  ): Quarter[] {
    const quarters = new Map<string, Quarter>();
    const fiscalYears: { fiscalYear: number; key: string; end: string }[] = [];

    for (const [key, epsValue] of eps) {
      const revenueValue = revenue.get(key);
      const label = epsValue.label ?? revenueValue?.label;
      if (!label) continue;

      const days = this.daysBetween(epsValue.start, epsValue.end);
      const quarterNumber = this.quarterNumber(label.fiscalPeriod);

      if (
        quarterNumber != null &&
        days >= QUARTER_MIN_DAYS &&
        days <= QUARTER_MAX_DAYS
      ) {
        quarters.set(`${label.fiscalYear}-Q${quarterNumber}`, {
          fiscalYear: label.fiscalYear,
          quarter: quarterNumber,
          end: epsValue.end,
          revenue: revenueValue?.value ?? null,
          eps: epsValue.value,
        });
      } else if (
        label.fiscalPeriod === 'FY' &&
        days >= YEAR_MIN_DAYS &&
        days <= YEAR_MAX_DAYS
      ) {
        fiscalYears.push({
          fiscalYear: label.fiscalYear,
          key,
          end: epsValue.end,
        });
      }
    }

    for (const { fiscalYear, key, end } of fiscalYears) {
      if (quarters.has(`${fiscalYear}-Q4`)) continue;
      const firstThree = [1, 2, 3].map((quarter) =>
        quarters.get(`${fiscalYear}-Q${quarter}`),
      );
      if (firstThree.some((quarter) => !quarter)) continue;

      const quarterRevenues = firstThree
        .map((quarter) => quarter!.revenue)
        .filter((value): value is number => value != null);
      const yearRevenue = revenue.get(key)?.value;
      const q4Revenue =
        yearRevenue != null && quarterRevenues.length === 3
          ? yearRevenue -
            quarterRevenues.reduce((total, value) => total + value)
          : null;

      quarters.set(`${fiscalYear}-Q4`, {
        fiscalYear,
        quarter: 4,
        end,
        revenue: q4Revenue,
        eps:
          eps.get(key)!.value -
          firstThree.reduce((total, quarter) => total + quarter!.eps, 0),
      });
    }

    return [...quarters.values()].sort((a, b) => b.end.localeCompare(a.end));
  }

  private quarterNumber(fiscalPeriod: string): number | null {
    const match = /^Q([1-4])$/.exec(fiscalPeriod);
    return match ? Number(match[1]) : null;
  }

  private daysBetween(from: string, to: string): number {
    return (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY;
  }
}
