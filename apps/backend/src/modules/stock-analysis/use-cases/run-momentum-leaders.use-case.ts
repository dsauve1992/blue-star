import { Inject, Injectable } from '@nestjs/common';
import { MomentumLeadersComputationService } from '../domain/services/momentum-leaders-computation.service';
import { MOMENTUM_LEADERS_COMPUTATION_SERVICE } from '../constants/tokens';

@Injectable()
export class RunMomentumLeadersUseCase {
  constructor(
    @Inject(MOMENTUM_LEADERS_COMPUTATION_SERVICE)
    private readonly computationService: MomentumLeadersComputationService,
  ) {}

  async execute(): Promise<void> {
    await this.computationService.computeMomentumLeaders();
  }
}
