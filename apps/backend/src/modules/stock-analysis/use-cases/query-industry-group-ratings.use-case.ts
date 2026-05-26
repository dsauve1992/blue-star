import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';

export interface QueryIndustryGroupRatingsRequestDto {
  industryGroup: string;
}

export interface IndustryGroupRatingDto {
  symbol: string;
  rsRating: number;
  weightedScore: number;
  groupSize: number;
}

export interface QueryIndustryGroupRatingsResponseDto {
  industryGroup: string;
  computedAt: string;
  ratings: IndustryGroupRatingDto[];
}

@Injectable()
export class QueryIndustryGroupRatingsUseCase {
  constructor(
    @Inject(INDUSTRY_GROUP_RS_RATING_REPOSITORY)
    private readonly repository: IndustryGroupRsRatingRepository,
  ) {}

  async execute(
    request: QueryIndustryGroupRatingsRequestDto,
  ): Promise<QueryIndustryGroupRatingsResponseDto> {
    const ratings = await this.repository.getLatestRatingsByGroup(
      request.industryGroup,
    );

    if (ratings.length === 0) {
      throw new NotFoundException(
        `No RS ratings found for industry group "${request.industryGroup}"`,
      );
    }

    return {
      industryGroup: request.industryGroup,
      computedAt: ratings[0].computedAt.toISOString().split('T')[0],
      ratings: ratings.map((r) => ({
        symbol: r.symbol,
        rsRating: r.rsRating,
        weightedScore: r.weightedScore,
        groupSize: r.groupSize,
      })),
    };
  }
}
