import { Inject, Injectable } from '@nestjs/common';
import { MOMENTUM_LEADER_REPOSITORY } from '../constants/tokens';
import type { MomentumLeaderRepository } from '../domain/repositories/momentum-leader.repository.interface';

export interface LatestMomentumLeaderSymbols {
  scanDate: Date;
  symbols: string[];
}

@Injectable()
export class GetLatestMomentumLeaderSymbolsUseCase {
  constructor(
    @Inject(MOMENTUM_LEADER_REPOSITORY)
    private readonly repository: MomentumLeaderRepository,
  ) {}

  async execute(): Promise<LatestMomentumLeaderSymbols | null> {
    const leaders = await this.repository.getLatestScan();
    if (leaders.length === 0) {
      return null;
    }
    return {
      scanDate: leaders[0].scanDate,
      symbols: leaders.map((leader) => leader.symbol),
    };
  }
}
