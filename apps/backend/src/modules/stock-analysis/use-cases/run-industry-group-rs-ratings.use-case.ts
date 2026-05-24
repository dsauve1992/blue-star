import { Inject, Injectable } from '@nestjs/common';
import { IndustryGroupRsRatingComputationService } from '../domain/services/industry-group-rs-rating-computation.service';
import { INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE } from '../constants/tokens';

@Injectable()
export class RunIndustryGroupRsRatingsUseCase {
  constructor(
    @Inject(INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE)
    private readonly computationService: IndustryGroupRsRatingComputationService,
  ) {}

  async execute(): Promise<void> {
    await this.computationService.computeIndustryGroupRsRatings();
  }
}
