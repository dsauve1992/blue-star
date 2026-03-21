import { Inject, Injectable } from '@nestjs/common';
import { RsRatingComputationService } from '../../domain/services/rs-rating-computation.service';
import { RsRatingScreenerService } from '../../domain/services/rs-rating-screener.service';
import { RsRatingRepository } from '../../domain/repositories/rs-rating.repository.interface';
import { RsRating } from '../../domain/value-objects/rs-rating';
import {
  RS_RATING_REPOSITORY,
  RS_RATING_SCREENER_SERVICE,
} from '../../constants/tokens';

@Injectable()
export class RsRatingComputationServiceImpl
  implements RsRatingComputationService
{
  constructor(
    @Inject(RS_RATING_SCREENER_SERVICE)
    private readonly screenerService: RsRatingScreenerService,
    @Inject(RS_RATING_REPOSITORY)
    private readonly repository: RsRatingRepository,
  ) {}

  async computeRsRatings(): Promise<void> {
    const results = await this.screenerService.fetchRsRatings();
    const today = new Date();

    const ratings = results.map((result) =>
      RsRating.of({
        symbol: result.symbol,
        rsRating: result.rsRating,
        weightedScore: result.weightedScore,
        computedAt: today,
      }),
    );

    await this.repository.saveRatings(ratings);
  }
}
