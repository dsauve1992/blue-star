import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FundamentalService,
  GetIncomeStatementHistoryOptions,
} from '../../domain/services/fundamental.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { IncomeStatement } from '../../domain/value-objects/income-statement';
import {
  AnnualFinancials,
  ComparableEps,
} from '../../domain/value-objects/annual-financials';

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

const NET_INCOME_CONCEPTS = [
  'NetIncomeLoss',
  'NetIncomeLossAvailableToCommonStockholdersBasic',
  'ProfitLoss',
];

const EQUITY_CONCEPTS = [
  'StockholdersEquity',
  'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
];

const PERIODIC_FORMS = new Set([
  '10-Q',
  '10-Q/A',
  '10-K',
  '10-K/A',
  '20-F',
  '20-F/A',
]);
const QUARTER_MIN_DAYS = 80;
const QUARTER_MAX_DAYS = 100;
const YEAR_MIN_DAYS = 350;
const YEAR_MAX_DAYS = 380;
const CONSECUTIVE_YEAR_MAX_GAP_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class SecEdgarFundamentalService implements FundamentalService {
  private readonly logger = new Logger(SecEdgarFundamentalService.name);
  private readonly userAgent: string;
  private cikByTicker: Promise<Map<string, string>> | null = null;
  private readonly inFlightConcepts = new Map<
    string,
    Promise<Record<string, SecConcept> | null>
  >();

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
    const concepts = await this.loadConcepts(ticker);
    if (!concepts) return [];

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

  async getAnnualFinancialsHistory(
    symbol: Symbol,
    options?: { limit?: number },
  ): Promise<AnnualFinancials[]> {
    const limit = options?.limit ?? 5;
    const ticker = this.toSecTicker(symbol.value);
    const concepts = await this.loadConcepts(ticker);
    if (!concepts) return [];

    const eps = this.periodValues(concepts, EPS_CONCEPTS, 'USD/shares');
    const netIncome = this.periodValues(concepts, NET_INCOME_CONCEPTS, 'USD');
    const equity = this.instantValues(concepts, EQUITY_CONCEPTS, 'USD');
    const comparableEps = this.comparableAnnualEps(concepts);

    const yearsByFiscalYear = new Map<number, AnnualFinancials>();
    for (const [key, epsValue] of eps) {
      const label = epsValue.label ?? netIncome.get(key)?.label;
      const days = this.daysBetween(epsValue.start, epsValue.end);
      if (
        label?.fiscalPeriod !== 'FY' ||
        days < YEAR_MIN_DAYS ||
        days > YEAR_MAX_DAYS
      ) {
        continue;
      }
      yearsByFiscalYear.set(
        label.fiscalYear,
        AnnualFinancials.of({
          symbol: ticker,
          fiscalYear: label.fiscalYear.toString(),
          eps: epsValue.value,
          comparableEps: comparableEps.get(key) ?? null,
          netIncome: netIncome.get(key)?.value ?? null,
          stockholdersEquity: equity.get(epsValue.end) ?? null,
        }),
      );
    }

    return [...yearsByFiscalYear.entries()]
      .sort(([a], [b]) => b - a)
      .slice(0, limit)
      .map(([, year]) => year);
  }

  private comparableAnnualEps(
    concepts: Record<string, SecConcept>,
  ): Map<string, ComparableEps> {
    const comparable = new Map<string, ComparableEps & { filed: string }>();
    for (const concept of EPS_CONCEPTS) {
      const units = concepts[concept]?.units ?? {};
      const perShareUnits = [
        'USD/shares',
        ...Object.keys(units).filter(
          (unit) => unit !== 'USD/shares' && unit.endsWith('/shares'),
        ),
      ];
      for (const unit of perShareUnits) {
        for (const [key, pair] of this.sameFilingYearPairs(units[unit] ?? [])) {
          const existing = comparable.get(key);
          if (!existing) comparable.set(key, pair);
        }
      }
    }
    return new Map(
      [...comparable].map(([key, { current, previous }]) => [
        key,
        { current, previous },
      ]),
    );
  }

  private sameFilingYearPairs(
    facts: SecFact[],
  ): Map<string, ComparableEps & { filed: string }> {
    const annualFactsByFiling = new Map<string, SecFact[]>();
    for (const fact of facts) {
      if (!fact.start || !PERIODIC_FORMS.has(fact.form)) continue;
      const days = this.daysBetween(fact.start, fact.end);
      if (days < YEAR_MIN_DAYS || days > YEAR_MAX_DAYS) continue;
      annualFactsByFiling.set(fact.accn, [
        ...(annualFactsByFiling.get(fact.accn) ?? []),
        fact,
      ]);
    }

    const pairs = new Map<string, ComparableEps & { filed: string }>();
    for (const filingFacts of annualFactsByFiling.values()) {
      const current = filingFacts.reduce((latest, fact) =>
        fact.end > latest.end ? fact : latest,
      );
      const previous = filingFacts.find((fact) => {
        const gap = this.daysBetween(fact.end, current.start!);
        return gap > 0 && gap <= CONSECUTIVE_YEAR_MAX_GAP_DAYS;
      });
      if (!previous) continue;

      const key = `${current.start}|${current.end}`;
      const existing = pairs.get(key);
      if (!existing || current.filed > existing.filed) {
        pairs.set(key, {
          current: current.val,
          previous: previous.val,
          filed: current.filed,
        });
      }
    }
    return pairs;
  }

  private loadConcepts(
    ticker: string,
  ): Promise<Record<string, SecConcept> | null> {
    const inFlight = this.inFlightConcepts.get(ticker);
    if (inFlight) return inFlight;

    const request = this.fetchConcepts(ticker).finally(() =>
      this.inFlightConcepts.delete(ticker),
    );
    this.inFlightConcepts.set(ticker, request);
    return request;
  }

  private async fetchConcepts(
    ticker: string,
  ): Promise<Record<string, SecConcept> | null> {
    const cik = (await this.loadCikByTicker()).get(ticker);
    if (!cik) {
      this.logger.debug(`No SEC CIK for ${ticker}`);
      return null;
    }

    const response = await this.secFetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `SEC companyfacts request failed for ${ticker}: HTTP ${response.status}`,
      );
    }

    const companyFacts = (await response.json()) as SecCompanyFacts;
    return companyFacts.facts?.['us-gaap'] ?? {};
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

  private instantValues(
    concepts: Record<string, SecConcept>,
    conceptPriority: string[],
    unit: string,
  ): Map<string, number> {
    const merged = new Map<string, number>();
    for (const concept of conceptPriority) {
      const latestByEnd = new Map<string, SecFact>();
      for (const fact of concepts[concept]?.units[unit] ?? []) {
        if (fact.start || !PERIODIC_FORMS.has(fact.form)) continue;
        const existing = latestByEnd.get(fact.end);
        if (!existing || fact.filed >= existing.filed) {
          latestByEnd.set(fact.end, fact);
        }
      }
      for (const [end, fact] of latestByEnd) {
        if (!merged.has(end)) merged.set(end, fact.val);
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
