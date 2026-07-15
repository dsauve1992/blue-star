import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaperTrade, PaperTradeContext } from '../domain/entities/paper-trade';
import { Shares } from '../domain/value-objects/shares';
import { WatchlistTicker } from '../../watchlist/domain/value-objects/watchlist-ticker';
import type { PaperTradeReadRepository } from '../domain/repositories/paper-trade-read.repository.interface';
import type { PaperTradeWriteRepository } from '../domain/repositories/paper-trade-write.repository.interface';
import {
  PAPER_TRADE_READ_REPOSITORY,
  PAPER_TRADE_WRITE_REPOSITORY,
} from '../constants/tokens';
import {
  RISK_FRACTION,
  STARTING_EQUITY,
  TARGET_R_MULTIPLE,
} from '../domain/paper-trading.constants';

export interface OpenPaperTradeRequest {
  ticker: WatchlistTicker;
  entryPrice: number;
  stopPrice: number;
  marketDate: string;
  openedAt: Date;
  context: PaperTradeContext;
}

export type OpenPaperTradeResult =
  | { opened: true; tradeId: string }
  | { opened: false; reason: string };

@Injectable()
export class OpenPaperTradeUseCase {
  private readonly logger = new Logger(OpenPaperTradeUseCase.name);

  constructor(
    @Inject(PAPER_TRADE_READ_REPOSITORY)
    private readonly readRepository: PaperTradeReadRepository,
    @Inject(PAPER_TRADE_WRITE_REPOSITORY)
    private readonly writeRepository: PaperTradeWriteRepository,
  ) {}

  async execute(request: OpenPaperTradeRequest): Promise<OpenPaperTradeResult> {
    const riskPerShare = request.entryPrice - request.stopPrice;
    if (riskPerShare <= 0) {
      return this.skip(
        request.ticker,
        `non-positive risk per share (entry ${request.entryPrice}, stop ${request.stopPrice})`,
      );
    }

    if (await this.readRepository.hasOpenTrade(request.ticker)) {
      return this.skip(
        request.ticker,
        'an open paper trade already exists for this ticker',
      );
    }

    const realizedPnl = await this.readRepository.getRealizedPnl();

    const equity = STARTING_EQUITY + realizedPnl;
    const riskBudget = equity * RISK_FRACTION;

    const shareCount = Math.floor(riskBudget / riskPerShare);

    if (shareCount < 1) {
      return this.skip(
        request.ticker,
        `insufficient sizing (riskBudget ${riskBudget.toFixed(2)}, riskPerShare ${riskPerShare.toFixed(2)})`,
      );
    }

    const targetPrice = request.entryPrice + TARGET_R_MULTIPLE * riskPerShare;

    const trade = PaperTrade.open({
      ticker: request.ticker,
      entryPrice: request.entryPrice,
      stopPrice: request.stopPrice,
      targetPrice,
      shares: Shares.of(shareCount),
      marketDate: request.marketDate,
      openedAt: request.openedAt,
      context: request.context,
    });

    await this.writeRepository.save(trade);

    this.logger.log(
      `Opened paper trade ${trade.id.value} for ${request.ticker.value}: ${shareCount} shares @ ${request.entryPrice}, stop ${request.stopPrice}, target ${targetPrice}`,
    );

    return { opened: true, tradeId: trade.id.value };
  }

  private skip(ticker: WatchlistTicker, reason: string): OpenPaperTradeResult {
    this.logger.log(`Skipping paper trade for ${ticker.value}: ${reason}`);
    return { opened: false, reason };
  }
}
