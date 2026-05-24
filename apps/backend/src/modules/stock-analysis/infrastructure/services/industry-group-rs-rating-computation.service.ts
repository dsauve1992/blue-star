import { Inject, Injectable, Logger } from '@nestjs/common';
import { IndustryGroupRsRatingComputationService } from '../../domain/services/industry-group-rs-rating-computation.service';
import { IndustryGroupRsRatingRepository } from '../../domain/repositories/industry-group-rs-rating.repository.interface';
import { RsRatingRepository } from '../../domain/repositories/rs-rating.repository.interface';
import { IndustryGroupRsRating } from '../../domain/value-objects/industry-group-rs-rating';
import {
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  MIN_INDUSTRY_GROUP_SIZE,
  RS_RATING_REPOSITORY,
} from '../../constants/tokens';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../../../stock-classification/constants/tokens';
import type { StockClassificationRepository } from '../../../stock-classification/domain/repositories/stock-classification.repository.interface';

interface ScoredSymbol {
  symbol: string;
  weightedScore: number;
}

@Injectable()
export class IndustryGroupRsRatingComputationServiceImpl
  implements IndustryGroupRsRatingComputationService
{
  private readonly logger = new Logger(
    IndustryGroupRsRatingComputationServiceImpl.name,
  );

  constructor(
    @Inject(RS_RATING_REPOSITORY)
    private readonly rsRatingRepository: RsRatingRepository,
    @Inject(STOCK_CLASSIFICATION_REPOSITORY)
    private readonly classificationRepository: StockClassificationRepository,
    @Inject(INDUSTRY_GROUP_RS_RATING_REPOSITORY)
    private readonly industryGroupRepository: IndustryGroupRsRatingRepository,
  ) {}

  async computeIndustryGroupRsRatings(): Promise<void> {
    const latest = await this.rsRatingRepository.getAllForLatestDate();
    if (latest.length === 0) {
      this.logger.warn(
        'No market-wide RS ratings found; skipping industry-group computation.',
      );
      return;
    }

    const computedAt = latest[0].computedAt;
    const symbols = latest.map((r) => r.symbol);
    const groupBySymbol =
      await this.classificationRepository.findGroupsForTickers(symbols);

    const byGroup = new Map<string, ScoredSymbol[]>();
    for (const rating of latest) {
      const group = groupBySymbol.get(rating.symbol);
      if (!group) continue;
      const bucket = byGroup.get(group) ?? [];
      bucket.push({
        symbol: rating.symbol,
        weightedScore: rating.weightedScore,
      });
      byGroup.set(group, bucket);
    }

    const ratings: IndustryGroupRsRating[] = [];
    let skippedGroups = 0;

    for (const [group, members] of byGroup) {
      if (members.length < MIN_INDUSTRY_GROUP_SIZE) {
        skippedGroups += 1;
        continue;
      }

      const scores = members.map((m) => m.weightedScore);
      for (const member of members) {
        const pct = percentileRank(scores, member.weightedScore);
        const rsRating = clamp(Math.round(pct), 1, 99);
        ratings.push(
          IndustryGroupRsRating.of({
            symbol: member.symbol,
            industryGroup: group,
            rsRating,
            weightedScore: member.weightedScore,
            groupSize: members.length,
            computedAt,
          }),
        );
      }
    }

    this.logger.log(
      `Computed ${ratings.length} intra-group RS ratings across ${
        byGroup.size - skippedGroups
      } groups (${skippedGroups} groups skipped for size < ${MIN_INDUSTRY_GROUP_SIZE}).`,
    );

    await this.industryGroupRepository.saveRatings(ratings);
  }
}

export function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
  }
  return ((below + 0.5 * equal) / values.length) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
