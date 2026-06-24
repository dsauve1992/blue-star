import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import {
  PaperTrade,
  PaperTradeExitReason,
  PaperTradeStatus,
} from '../../domain/entities/paper-trade';
import { PaperTradeReadRepository as IPaperTradeReadRepository } from '../../domain/repositories/paper-trade-read.repository.interface';
import { PaperTradeId } from '../../domain/value-objects/paper-trade-id';
import { Shares } from '../../domain/value-objects/shares';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';

interface PaperTradeRow {
  id: string;
  ticker: string;
  watchlist_id: string | null;
  watchlist_name: string | null;
  status: string;
  shares: number;
  entry_price: string;
  stop_price: string;
  target_price: string;
  risk_per_share: string;
  exit_price: string | null;
  exit_reason: string | null;
  realized_r: string | null;
  pnl: string | null;
  market_date: string;
  opened_at: string;
  closed_at: string | null;
}

@Injectable()
export class PaperTradeReadRepository implements IPaperTradeReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string): Promise<PaperTrade | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM paper_trades WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0] as PaperTradeRow);
  }

  async findOpen(): Promise<PaperTrade[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM paper_trades WHERE status = $1 ORDER BY opened_at ASC`,
      [PaperTradeStatus.OPEN],
    );
    return result.rows.map((row) => this.mapRow(row as PaperTradeRow));
  }

  async hasOpenTrade(ticker: WatchlistTicker): Promise<boolean> {
    const result = await this.databaseService.query(
      `SELECT 1 FROM paper_trades WHERE ticker = $1 AND status = $2 LIMIT 1`,
      [ticker.value, PaperTradeStatus.OPEN],
    );
    return result.rows.length > 0;
  }

  async list(status?: PaperTradeStatus): Promise<PaperTrade[]> {
    const result = status
      ? await this.databaseService.query(
          `SELECT * FROM paper_trades WHERE status = $1 ORDER BY opened_at DESC`,
          [status],
        )
      : await this.databaseService.query(
          `SELECT * FROM paper_trades ORDER BY opened_at DESC`,
        );
    return result.rows.map((row) => this.mapRow(row as PaperTradeRow));
  }

  async getRealizedPnl(): Promise<number> {
    const result = await this.databaseService.query(
      `SELECT COALESCE(SUM(pnl), 0) AS total FROM paper_trades WHERE status = $1`,
      [PaperTradeStatus.CLOSED],
    );
    return Number((result.rows[0] as { total: string }).total);
  }

  async getCommittedCash(): Promise<number> {
    const result = await this.databaseService.query(
      `SELECT COALESCE(SUM(entry_price * shares), 0) AS total FROM paper_trades WHERE status = $1`,
      [PaperTradeStatus.OPEN],
    );
    return Number((result.rows[0] as { total: string }).total);
  }

  private mapRow(row: PaperTradeRow): PaperTrade {
    return PaperTrade.fromSnapshot({
      id: PaperTradeId.of(row.id),
      ticker: WatchlistTicker.of(row.ticker),
      watchlistId: row.watchlist_id ?? undefined,
      watchlistName: row.watchlist_name ?? undefined,
      status: row.status as PaperTradeStatus,
      shares: Shares.of(row.shares),
      entryPrice: Number(row.entry_price),
      stopPrice: Number(row.stop_price),
      targetPrice: Number(row.target_price),
      riskPerShare: Number(row.risk_per_share),
      exitPrice: row.exit_price !== null ? Number(row.exit_price) : undefined,
      exitReason:
        row.exit_reason !== null
          ? (row.exit_reason as PaperTradeExitReason)
          : undefined,
      realizedR: row.realized_r !== null ? Number(row.realized_r) : undefined,
      pnl: row.pnl !== null ? Number(row.pnl) : undefined,
      marketDate: row.market_date,
      openedAt: new Date(row.opened_at),
      closedAt: row.closed_at !== null ? new Date(row.closed_at) : undefined,
    });
  }
}
