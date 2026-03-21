import { Inject, Injectable } from '@nestjs/common';
import { RsRatingRepository } from '../domain/repositories/rs-rating.repository.interface';
import { RS_RATING_REPOSITORY } from '../constants/tokens';

export interface QueryRsRatingsRequestDto {
  symbols: string[];
}

export interface RsRatingDto {
  symbol: string;
  rsRating: number;
  weightedScore: number;
  computedAt: string;
}

export interface QueryRsRatingsResponseDto {
  ratings: RsRatingDto[];
}

@Injectable()
export class QueryRsRatingsUseCase {
  constructor(
    @Inject(RS_RATING_REPOSITORY)
    private readonly repository: RsRatingRepository,
  ) {}

  async execute(
    request: QueryRsRatingsRequestDto,
  ): Promise<QueryRsRatingsResponseDto> {
    const ratings = await this.repository.getLatestRatings(request.symbols);

    return {
      ratings: ratings.map((r) => ({
        symbol: r.symbol,
        rsRating: r.rsRating,
        weightedScore: r.weightedScore,
        computedAt: r.computedAt.toISOString().split('T')[0],
      })),
    };
  }
}
