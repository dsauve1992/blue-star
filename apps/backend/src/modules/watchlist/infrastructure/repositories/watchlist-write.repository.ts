import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { Watchlist } from '../../domain/entities/watchlist';
import { WatchlistId } from '../../domain/value-objects/watchlist-id';
import { WatchlistName } from '../../domain/value-objects/watchlist-name';
import { UserId } from 'src/modules/position/domain/value-objects/user-id';
import { WatchlistTicker } from '../../domain/value-objects/watchlist-ticker';
import { WatchlistWriteRepository as IWatchlistWriteRepository } from '../../domain/repositories/watchlist-write.repository.interface';
import { InvariantError } from '../../domain/domain-errors';

interface DatabaseRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  tickers: string[];
}

@Injectable()
export class WatchlistWriteRepository implements IWatchlistWriteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(watchlist: Watchlist): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      const watchlistQuery = `
        INSERT INTO watchlists (id, user_id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          updated_at = NOW()
      `;

      await client.query(watchlistQuery, [
        watchlist.id.value,
        watchlist.userId.value,
        watchlist.name.value,
        watchlist.createdAt.toISOString(),
      ]);

      await client.query(
        'DELETE FROM watchlist_tickers WHERE watchlist_id = $1',
        [watchlist.id.value],
      );

      for (const ticker of watchlist.tickers) {
        const tickerQuery = `
          INSERT INTO watchlist_tickers (id, watchlist_id, ticker, created_at)
          VALUES (gen_random_uuid(), $1, $2, NOW())
        `;
        await client.query(tickerQuery, [watchlist.id.value, ticker.value]);
      }
    });
  }

  async getById(watchlistId: WatchlistId): Promise<Watchlist> {
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

    const result = await this.databaseService.query(query, [watchlistId.value]);

    if (result.rows.length === 0) {
      throw new InvariantError(
        `Watchlist with ID ${watchlistId.value} not found`,
      );
    }

    return this.mapRowToWatchlist(result.rows[0] as DatabaseRow);
  }

  async delete(watchlistId: WatchlistId): Promise<void> {
    await this.databaseService.query('DELETE FROM watchlists WHERE id = $1', [
      watchlistId.value,
    ]);
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
