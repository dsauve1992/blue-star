import { Inject, Injectable } from '@nestjs/common';
import { RsRatingComputationService } from '../domain/services/rs-rating-computation.service';
import { RS_RATING_COMPUTATION_SERVICE } from '../constants/tokens';

@Injectable()
export class RunRsRatingsUseCase {
  constructor(
    @Inject(RS_RATING_COMPUTATION_SERVICE)
    private readonly computationService: RsRatingComputationService,
  ) {}

  async execute(): Promise<void> {
    await this.computationService.computeRsRatings();
  }
}
