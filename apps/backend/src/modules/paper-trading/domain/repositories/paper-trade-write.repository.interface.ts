import { PaperTrade } from '../entities/paper-trade';

export interface PaperTradeWriteRepository {
  save(trade: PaperTrade): Promise<void>;
}
