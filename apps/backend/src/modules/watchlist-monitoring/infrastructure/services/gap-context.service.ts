import { Inject, Injectable, Logger } from '@nestjs/common';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import {
  GapContext,
  IndustryGroupQuadrant,
} from '../../domain/value-objects/gap-context';
import { GapContextService as IGapContextService } from '../../domain/services/gap-context.service';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../../../stock-classification/constants/tokens';
import type { StockClassificationRepository } from '../../../stock-classification/domain/repositories/stock-classification.repository.interface';
import { GetLatestRsRatingUseCase } from '../../../stock-analysis/use-cases/get-latest-rs-rating.use-case';
import { GetLatestIndustryGroupRsRatingUseCase } from '../../../stock-analysis/use-cases/get-latest-industry-group-rs-rating.use-case';
import { GetIndustryGroupQuadrantUseCase } from '../../../sector-rotation/use-cases/get-industry-group-quadrant.use-case';

@Injectable()
export class GapContextServiceImpl implements IGapContextService {
  private readonly logger = new Logger(GapContextServiceImpl.name);

  constructor(
    @Inject(STOCK_CLASSIFICATION_REPOSITORY)
    private readonly classificationRepository: StockClassificationRepository,
    private readonly getLatestRsRating: GetLatestRsRatingUseCase,
    private readonly getLatestIndustryGroupRsRating: GetLatestIndustryGroupRsRatingUseCase,
    private readonly getIndustryGroupQuadrant: GetIndustryGroupQuadrantUseCase,
  ) {}

  async enrich(ticker: WatchlistTicker): Promise<GapContext> {
    const symbol = ticker.symbolOnly;

    const [industryGroup, globalRsRating, industryGroupRsRating] =
      await Promise.all([
        this.lookupIndustryGroup(symbol),
        this.lookupGlobalRsRating(symbol),
        this.lookupIndustryGroupRsRating(symbol),
      ]);

    const industryGroupQuadrant =
      await this.lookupIndustryGroupQuadrant(industryGroup);

    return GapContext.of({
      industryGroup,
      globalRsRating,
      industryGroupRsRating,
      industryGroupQuadrant,
    });
  }

  private async lookupIndustryGroup(symbol: string): Promise<string | null> {
    try {
      const classification =
        await this.classificationRepository.findByTicker(symbol);
      return classification?.industryGroup ?? null;
    } catch (error) {
      this.warn('industry group', symbol, error);
      return null;
    }
  }

  private async lookupGlobalRsRating(symbol: string): Promise<number | null> {
    try {
      return await this.getLatestRsRating.execute(symbol);
    } catch (error) {
      this.warn('global RS rating', symbol, error);
      return null;
    }
  }

  private async lookupIndustryGroupRsRating(
    symbol: string,
  ): Promise<number | null> {
    try {
      return await this.getLatestIndustryGroupRsRating.execute(symbol);
    } catch (error) {
      this.warn('industry-group RS rating', symbol, error);
      return null;
    }
  }

  private async lookupIndustryGroupQuadrant(
    industryGroup: string | null,
  ): Promise<IndustryGroupQuadrant | null> {
    if (!industryGroup) return null;
    try {
      const quadrant =
        await this.getIndustryGroupQuadrant.execute(industryGroup);
      return quadrant as IndustryGroupQuadrant | null;
    } catch (error) {
      this.warn('industry-group quadrant', industryGroup, error);
      return null;
    }
  }

  private warn(field: string, key: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.warn(`Failed to resolve ${field} for ${key}: ${message}`);
  }
}
