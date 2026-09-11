import { Inject, Injectable } from '@nestjs/common';
import { MomentumLeadersComputationService } from '../../domain/services/momentum-leaders-computation.service';
import { MomentumLeadersScreenerService } from '../../domain/services/momentum-leaders-screener.service';
import { MomentumLeaderRepository } from '../../domain/repositories/momentum-leader.repository.interface';
import { MomentumLeader } from '../../domain/value-objects/momentum-leader';
import {
  MOMENTUM_LEADER_REPOSITORY,
  MOMENTUM_LEADERS_SCREENER_SERVICE,
} from '../../constants/tokens';

@Injectable()
export class MomentumLeadersComputationServiceImpl
  implements MomentumLeadersComputationService
{
  constructor(
    @Inject(MOMENTUM_LEADERS_SCREENER_SERVICE)
    private readonly screenerService: MomentumLeadersScreenerService,
    @Inject(MOMENTUM_LEADER_REPOSITORY)
    private readonly repository: MomentumLeaderRepository,
  ) {}

  async computeMomentumLeaders(): Promise<void> {
    const scan = await this.screenerService.fetchMomentumLeaders();
    const scanDate = new Date(scan.scanDate);

    const leaders = scan.leaders.map((result) =>
      MomentumLeader.of({
        ...result,
        scanDate,
        universeSize: scan.universeSize,
      }),
    );

    await this.repository.replaceScan(scanDate, leaders);
  }
}
