import { Inject, Injectable, Logger } from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';
import {
  AI_FINANCIAL_RATER,
  AI_FINANCIAL_RATING_REPOSITORY,
} from '../constants/tokens';
import {
  AiFinancialRater,
  AiFinancialRating,
} from '../domain/services/ai-financial-rater';
import type { AiFinancialRatingRepository } from '../domain/repositories/ai-financial-rating.repository.interface';
import { NotFoundError } from '../domain/domain-errors';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { ComputeFinancialReportUseCase } from './compute-financial-report.use-case';

export interface RateFinancialsWithAiRequestDto {
  symbol: Symbol;
}

export interface RateFinancialsWithAiResponseDto {
  rating: AiFinancialRating;
}

@Injectable()
export class RateFinancialsWithAiUseCase {
  private readonly logger = new Logger(RateFinancialsWithAiUseCase.name);
  private readonly inFlightRatings = new Map<
    string,
    Promise<AiFinancialRating>
  >();

  constructor(
    private readonly computeFinancialReportUseCase: ComputeFinancialReportUseCase,
    @Inject(AI_FINANCIAL_RATER)
    private readonly aiFinancialRater: AiFinancialRater,
    @Inject(AI_FINANCIAL_RATING_REPOSITORY)
    private readonly aiFinancialRatingRepository: AiFinancialRatingRepository,
  ) {}

  async execute(
    request: RateFinancialsWithAiRequestDto,
  ): Promise<RateFinancialsWithAiResponseDto> {
    const { report } =
      await this.computeFinancialReportUseCase.execute(request);
    if (!report.quarterlyGrowths.length && !report.annualGrowths.length) {
      throw new NotFoundError(
        `No financial data to rate for ${request.symbol.value}`,
      );
    }

    const fingerprint = this.aiFinancialRater.requestFingerprint(report);
    const cached = await this.aiFinancialRatingRepository.findByFingerprint(
      request.symbol,
      fingerprint,
    );
    if (cached) return { rating: cached };

    return { rating: await this.rateOnce(request.symbol, fingerprint, report) };
  }

  private rateOnce(
    symbol: Symbol,
    fingerprint: string,
    report: FinancialReport,
  ): Promise<AiFinancialRating> {
    const key = `${symbol.value}:${fingerprint}`;
    const inFlight = this.inFlightRatings.get(key);
    if (inFlight) return inFlight;

    const rating = this.aiFinancialRater
      .rate(report)
      .then(async (result) => {
        await this.saveRating(symbol, fingerprint, result);
        return result;
      })
      .finally(() => this.inFlightRatings.delete(key));
    this.inFlightRatings.set(key, rating);
    return rating;
  }

  private async saveRating(
    symbol: Symbol,
    fingerprint: string,
    rating: AiFinancialRating,
  ): Promise<void> {
    try {
      await this.aiFinancialRatingRepository.save(symbol, fingerprint, rating);
    } catch (error) {
      this.logger.error(
        `Failed to cache AI rating for ${symbol.value}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
