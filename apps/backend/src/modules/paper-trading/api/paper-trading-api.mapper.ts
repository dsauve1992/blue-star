import { Injectable } from '@nestjs/common';
import { PaperTrade } from '../domain/entities/paper-trade';
import { PaperTradingStats } from '../use-cases/get-paper-trading-stats.use-case';
import {
  PaperTradeApiDto,
  PaperTradingStatsApiDto,
} from './paper-trading-api.dto';

@Injectable()
export class PaperTradingApiMapper {
  mapTrade(trade: PaperTrade): PaperTradeApiDto {
    return {
      id: trade.id.value,
      ticker: trade.ticker.value,
      watchlistName: trade.watchlistName ?? null,
      status: trade.status,
      shares: trade.shares.value,
      entryPrice: trade.entryPrice,
      stopPrice: trade.stopPrice,
      targetPrice: trade.targetPrice,
      riskPerShare: trade.riskPerShare,
      exitPrice: trade.exitPrice ?? null,
      exitReason: trade.exitReason ?? null,
      realizedR: trade.realizedR ?? null,
      pnl: trade.pnl ?? null,
      marketDate: trade.marketDate,
      openedAt: trade.openedAt.toISOString(),
      closedAt: trade.closedAt ? trade.closedAt.toISOString() : null,
    };
  }

  mapStats(stats: PaperTradingStats): PaperTradingStatsApiDto {
    return { ...stats };
  }
}
