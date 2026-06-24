import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PaperTrade,
  PaperTradeExitReason,
} from '../domain/entities/paper-trade';
import type { PaperTradeWriteRepository } from '../domain/repositories/paper-trade-write.repository.interface';
import { PAPER_TRADE_WRITE_REPOSITORY } from '../constants/tokens';

export interface ClosePaperTradeRequest {
  trade: PaperTrade;
  exitPrice: number;
  exitReason: PaperTradeExitReason;
  closedAt: Date;
}

@Injectable()
export class ClosePaperTradeUseCase {
  private readonly logger = new Logger(ClosePaperTradeUseCase.name);

  constructor(
    @Inject(PAPER_TRADE_WRITE_REPOSITORY)
    private readonly writeRepository: PaperTradeWriteRepository,
  ) {}

  async execute(request: ClosePaperTradeRequest): Promise<void> {
    const { trade, exitPrice, exitReason, closedAt } = request;

    trade.close(exitPrice, exitReason, closedAt);
    await this.writeRepository.save(trade);

    this.logger.log(
      `Closed paper trade ${trade.id.value} for ${trade.ticker.value} at ${exitPrice} (${exitReason}): pnl ${trade.pnl}, R ${trade.realizedR}`,
    );
  }
}
