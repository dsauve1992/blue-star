import { Inject, Injectable } from '@nestjs/common';
import { PaperTrade, PaperTradeStatus } from '../domain/entities/paper-trade';
import type { PaperTradeReadRepository } from '../domain/repositories/paper-trade-read.repository.interface';
import { PAPER_TRADE_READ_REPOSITORY } from '../constants/tokens';

@Injectable()
export class GetPaperTradesUseCase {
  constructor(
    @Inject(PAPER_TRADE_READ_REPOSITORY)
    private readonly readRepository: PaperTradeReadRepository,
  ) {}

  execute(status?: PaperTradeStatus): Promise<PaperTrade[]> {
    return this.readRepository.list(status);
  }
}
