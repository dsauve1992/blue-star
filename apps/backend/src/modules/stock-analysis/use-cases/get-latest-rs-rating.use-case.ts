import { Inject, Injectable } from '@nestjs/common';
import { RS_RATING_REPOSITORY } from '../constants/tokens';
import type { RsRatingRepository } from '../domain/repositories/rs-rating.repository.interface';

@Injectable()
export class GetLatestRsRatingUseCase {
  constructor(
    @Inject(RS_RATING_REPOSITORY)
    private readonly rsRatingRepository: RsRatingRepository,
  ) {}

  async execute(symbol: string): Promise<number | null> {
    const rating = await this.rsRatingRepository.getLatestRating(symbol);
    return rating?.rsRating ?? null;
  }
}
