import { Inject, Injectable } from '@nestjs/common';
import { LeaderScanRepository } from '../domain/repositories/leader-scan.repository.interface';
import { LEADER_SCAN_REPOSITORY } from '../constants/tokens';
import { LeaderDto } from './query-latest-leaders.use-case';

export interface QueryLeaderBySymbolResponseDto {
  isLeader: boolean;
  leader: LeaderDto | null;
}

@Injectable()
export class QueryLeaderBySymbolUseCase {
  constructor(
    @Inject(LEADER_SCAN_REPOSITORY)
    private readonly repository: LeaderScanRepository,
  ) {}

  async execute(symbol: string): Promise<QueryLeaderBySymbolResponseDto> {
    const r = await this.repository.getLatestResultForSymbol(symbol);

    if (!r) {
      return { isLeader: false, leader: null };
    }

    return {
      isLeader: true,
      leader: {
        symbol: r.symbol,
        scanDate: r.scanDate.toISOString(),
        exchange: r.exchange,
        sector: r.sector,
        perf1M: r.perf1M,
        perf3M: r.perf3M,
        perf6M: r.perf6M,
        rank1M: r.rank1M,
        rank3M: r.rank3M,
        rank6M: r.rank6M,
        rsScore: r.rsScore.value,
        adr20: r.adr20,
        dollarVolume20: r.dollarVolume20,
        top1MFlag: r.top1MFlag,
        top3MFlag: r.top3MFlag,
        top6MFlag: r.top6MFlag,
        smallSizeFlag: r.smallSizeFlag,
      },
    };
  }
}
