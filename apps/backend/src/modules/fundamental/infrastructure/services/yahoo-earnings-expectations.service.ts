import { Injectable } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { EarningsExpectationsService } from '../../domain/services/earnings-expectations.service';
import { EarningsExpectations } from '../../domain/value-objects/earnings-expectations';
import { EarningsSurprise } from '../../domain/value-objects/earnings-surprise';
import {
  EstimatePeriod,
  EstimateTrend,
} from '../../domain/value-objects/estimate-trend';

const ESTIMATE_PERIODS: readonly string[] = ['0q', '+1q', '0y', '+1y'];
const NO_COVERAGE_MESSAGES = [
  'No fundamentals data found',
  'Quote not found',
] as const;

interface YahooEarningsHistoryEntry {
  quarter: Date | null;
  epsActual: number | null;
  epsEstimate: number | null;
}

interface YahooEarningsTrendEntry {
  period: string;
  endDate: Date | null;
  earningsEstimate?: { numberOfAnalysts: number | null };
  revenueEstimate?: {
    avg: number | null;
    yearAgoRevenue: number | null;
    growth: number | null;
  };
  epsTrend?: {
    current: number | null;
    '30daysAgo': number | null;
    '90daysAgo': number | null;
  };
  epsRevisions?: {
    upLast30days?: number | null;
    downLast30days?: number | null;
  };
}

@Injectable()
export class YahooEarningsExpectationsService
  implements EarningsExpectationsService
{
  private readonly yahooFinance: InstanceType<typeof YahooFinance>;

  constructor() {
    this.yahooFinance = new YahooFinance();
  }

  async getEarningsExpectations(symbol: Symbol): Promise<EarningsExpectations> {
    const summary = await this.fetchEarningsSummary(symbol);

    return EarningsExpectations.of({
      symbol: symbol.value,
      surprises: (summary.earningsHistory?.history ?? []).flatMap((entry) =>
        this.toSurprise(entry),
      ),
      estimateTrends: (summary.earningsTrend?.trend ?? [])
        .filter((entry) => ESTIMATE_PERIODS.includes(entry.period))
        .map((entry) => this.toEstimateTrend(entry)),
    });
  }

  private async fetchEarningsSummary(symbol: Symbol) {
    try {
      return await this.yahooFinance.quoteSummary(symbol.value, {
        modules: ['earningsHistory', 'earningsTrend'],
      });
    } catch (error) {
      if (isNoCoverageError(error)) return {};
      throw error;
    }
  }

  private toSurprise(entry: YahooEarningsHistoryEntry): EarningsSurprise[] {
    if (
      entry.quarter === null ||
      entry.epsActual === null ||
      entry.epsEstimate === null
    ) {
      return [];
    }
    return [
      EarningsSurprise.of({
        quarterEnd: toIsoDate(entry.quarter),
        epsActual: entry.epsActual,
        epsEstimate: entry.epsEstimate,
      }),
    ];
  }

  private toEstimateTrend(entry: YahooEarningsTrendEntry): EstimateTrend {
    const revenueEstimate = entry.revenueEstimate?.avg || null;
    const revenueGrowth = entry.revenueEstimate?.yearAgoRevenue
      ? (entry.revenueEstimate.growth ?? null)
      : null;
    return EstimateTrend.of({
      period: entry.period as EstimatePeriod,
      endDate: entry.endDate ? toIsoDate(entry.endDate) : null,
      analystCount: entry.earningsEstimate?.numberOfAnalysts ?? null,
      epsEstimate: entry.epsTrend?.current ?? null,
      epsEstimate30DaysAgo: entry.epsTrend?.['30daysAgo'] ?? null,
      epsEstimate90DaysAgo: entry.epsTrend?.['90daysAgo'] ?? null,
      upRevisionsLast30Days: entry.epsRevisions?.upLast30days ?? null,
      downRevisionsLast30Days: entry.epsRevisions?.downLast30days ?? null,
      revenueEstimate,
      revenueGrowthPercent:
        revenueEstimate === null || revenueGrowth === null
          ? null
          : revenueGrowth * 100,
    });
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isNoCoverageError(error: unknown): boolean {
  return (
    error instanceof Error &&
    NO_COVERAGE_MESSAGES.some((message) => error.message.startsWith(message))
  );
}
