import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { UserId } from 'src/modules/position/domain/value-objects/user-id';
import { WatchlistTicker } from '../../domain/value-objects/watchlist-ticker';
import { WatchlistReadRepository as IWatchlistReadRepository } from '../../domain/repositories/watchlist-read.repository.interface';

interface DatabaseRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  tickers: string[];
}

@Injectable()
export class WatchlistReadRepository implements IWatchlistReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(watchlistId: WatchlistId): Promise<Watchlist | null> {
    const query = `
      SELECT 
        w.id,
        w.user_id,
        w.name,
        w.created_at,
        w.updated_at,
        COALESCE(
          json_agg(wt.ticker ORDER BY wt.created_at) FILTER (WHERE wt.ticker IS NOT NULL),
          '[]'::json
        ) as tickers
      FROM watchlists w
      LEFT JOIN watchlist_tickers wt ON w.id = wt.watchlist_id
      WHERE w.id = $1
      GROUP BY w.id, w.user_id, w.name, w.created_at, w.updated_at
    `;

    const result = await this.databaseService.query(query, [
      watchlistId.value,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWatchlist(result.rows[0] as DatabaseRow);
  }

  async findByUserId(userId: UserId): Promise<Watchlist[]> {
    const query = `
      SELECT 
        w.id,
        w.user_id,
        w.name,
        w.created_at,
        w.updated_at,
        COALESCE(
          json_agg(wt.ticker ORDER BY wt.created_at) FILTER (WHERE wt.ticker IS NOT NULL),
          '[]'::json
        ) as tickers
      FROM watchlists w
      LEFT JOIN watchlist_tickers wt ON w.id = wt.watchlist_id
      WHERE w.user_id = $1
      GROUP BY w.id, w.user_id, w.name, w.created_at, w.updated_at
      ORDER BY w.created_at DESC
    `;

    const result = await this.databaseService.query(query, [userId.value]);
    return result.rows.map((row) => this.mapRowToWatchlist(row as DatabaseRow));
  }

  async findAll(): Promise<Watchlist[]> {
    const query = `
      SELECT 
        w.id,
        w.user_id,
        w.name,
        w.created_at,
        w.updated_at,
        COALESCE(
          json_agg(wt.ticker ORDER BY wt.created_at) FILTER (WHERE wt.ticker IS NOT NULL),
          '[]'::json
        ) as tickers
      FROM watchlists w
      LEFT JOIN watchlist_tickers wt ON w.id = wt.watchlist_id
      GROUP BY w.id, w.user_id, w.name, w.created_at, w.updated_at
      ORDER BY w.created_at DESC
    `;

    const result = await this.databaseService.query(query);
    return result.rows.map((row) => this.mapRowToWatchlist(row as DatabaseRow));
  }

  private mapRowToWatchlist(row: DatabaseRow): Watchlist {
    const tickers = (row.tickers || []).map((ticker: string) =>
      WatchlistTicker.of(ticker),
    );

    return Watchlist.fromData({
      id: WatchlistId.of(row.id),
      userId: UserId.of(row.user_id),
      name: WatchlistName.of(row.name),
      tickers,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}

