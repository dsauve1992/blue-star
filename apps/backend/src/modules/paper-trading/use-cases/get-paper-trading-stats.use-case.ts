import { Inject, Injectable } from '@nestjs/common';
import { PaperTradeStatus } from '../domain/entities/paper-trade';
import type { PaperTradeReadRepository } from '../domain/repositories/paper-trade-read.repository.interface';
import { PAPER_TRADE_READ_REPOSITORY } from '../constants/tokens';
import { STARTING_EQUITY } from '../domain/paper-trading.constants';

export interface PaperTradingStats {
  startingEquity: number;
  currentEquity: number;
  openCount: number;
  closedCount: number;
  winners: number;
  losers: number;
  winRate: number;
  averageR: number;
  expectancyR: number;
  totalPnl: number;
}

@Injectable()
export class GetPaperTradingStatsUseCase {
  constructor(
    @Inject(PAPER_TRADE_READ_REPOSITORY)
    private readonly readRepository: PaperTradeReadRepository,
  ) {}

  async execute(): Promise<PaperTradingStats> {
    const [open, closed, realizedPnl] = await Promise.all([
      this.readRepository.list(PaperTradeStatus.OPEN),
      this.readRepository.list(PaperTradeStatus.CLOSED),
      this.readRepository.getRealizedPnl(),
    ]);

    const closedCount = closed.length;
    const rValues = closed.map((trade) => trade.realizedR ?? 0);
    const winners = rValues.filter((r) => r > 0).length;
    const losers = closedCount - winners;
    const sumR = rValues.reduce((sum, r) => sum + r, 0);

    const winRate = closedCount > 0 ? winners / closedCount : 0;
    const averageR = closedCount > 0 ? sumR / closedCount : 0;

    return {
      startingEquity: STARTING_EQUITY,
      currentEquity: STARTING_EQUITY + realizedPnl,
      openCount: open.length,
      closedCount,
      winners,
      losers,
      winRate,
      averageR,
      expectancyR: averageR,
      totalPnl: realizedPnl,
    };
  }
}
