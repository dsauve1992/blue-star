import { Inject, Injectable } from '@nestjs/common';
import { RsRatingRepository } from '../domain/repositories/rs-rating.repository.interface';
import { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import {
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  RS_RATING_REPOSITORY,
} from '../constants/tokens';

export interface QueryRsRatingsRequestDto {
  symbols: string[];
}

export interface RsRatingDto {
  symbol: string;
  rsRating: number;
  weightedScore: number;
  computedAt: string;
  industryGroupRsRating: number | null;
  industryGroup: string | null;
}

export interface QueryRsRatingsResponseDto {
  ratings: RsRatingDto[];
}

@Injectable()
export class QueryRsRatingsUseCase {
  constructor(
    @Inject(RS_RATING_REPOSITORY)
    private readonly repository: RsRatingRepository,
    @Inject(INDUSTRY_GROUP_RS_RATING_REPOSITORY)
    private readonly industryGroupRepository: IndustryGroupRsRatingRepository,
  ) {}

  async execute(
    request: QueryRsRatingsRequestDto,
  ): Promise<QueryRsRatingsResponseDto> {
    const [ratings, groupRatings] = await Promise.all([
      this.repository.getLatestRatings(request.symbols),
      this.industryGroupRepository.getLatestRatings(request.symbols),
    ]);

    const groupBySymbol = new Map(groupRatings.map((g) => [g.symbol, g]));

    return {
      ratings: ratings.map((r) => {
        const group = groupBySymbol.get(r.symbol);
        return {
          symbol: r.symbol,
          rsRating: r.rsRating,
          weightedScore: r.weightedScore,
          computedAt: r.computedAt.toISOString().split('T')[0],
          industryGroupRsRating: group?.rsRating ?? null,
          industryGroup: group?.industryGroup ?? null,
        };
      }),
    };
  }
}
