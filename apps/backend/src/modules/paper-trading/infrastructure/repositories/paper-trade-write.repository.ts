import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { PaperTrade } from '../../domain/entities/paper-trade';
import { PaperTradeWriteRepository as IPaperTradeWriteRepository } from '../../domain/repositories/paper-trade-write.repository.interface';

@Injectable()
export class PaperTradeWriteRepository implements IPaperTradeWriteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(trade: PaperTrade): Promise<void> {
    const query = `
      INSERT INTO paper_trades (
        id, ticker, status, shares,
        entry_price, stop_price, target_price, risk_per_share,
        exit_price, exit_reason, realized_r, pnl,
        market_date, opened_at, closed_at,
        industry_group, global_rs_rating, industry_group_rs_rating, industry_group_quadrant,
        created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        exit_price = EXCLUDED.exit_price,
        exit_reason = EXCLUDED.exit_reason,
        realized_r = EXCLUDED.realized_r,
        pnl = EXCLUDED.pnl,
        closed_at = EXCLUDED.closed_at
    `;

    await this.databaseService.query(query, [
      trade.id.value,
      trade.ticker.value,
      trade.status,
      trade.shares.value,
      trade.entryPrice,
      trade.stopPrice,
      trade.targetPrice,
      trade.riskPerShare,
      trade.exitPrice ?? null,
      trade.exitReason ?? null,
      trade.realizedR ?? null,
      trade.pnl ?? null,
      trade.marketDate,
      trade.openedAt,
      trade.closedAt ?? null,
      trade.context.industryGroup,
      trade.context.globalRsRating,
      trade.context.industryGroupRsRating,
      trade.context.industryGroupQuadrant,
    ]);
  }
}
