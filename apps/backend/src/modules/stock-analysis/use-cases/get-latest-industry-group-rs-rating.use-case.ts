import { Inject, Injectable } from '@nestjs/common';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';
import type { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';

@Injectable()
export class GetLatestIndustryGroupRsRatingUseCase {
  constructor(
    @Inject(INDUSTRY_GROUP_RS_RATING_REPOSITORY)
    private readonly industryGroupRsRatingRepository: IndustryGroupRsRatingRepository,
  ) {}

  async execute(symbol: string): Promise<number | null> {
    const rating =
      await this.industryGroupRsRatingRepository.getLatestRating(symbol);
    return rating?.rsRating ?? null;
  }
}
