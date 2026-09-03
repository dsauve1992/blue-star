import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MarketBreadthRepository } from '../../domain/repositories/market-breadth.repository.interface';
import { MarketBreadthAggregate } from '../../domain/entities/market-breadth-aggregate';
import { BreadthDate } from '../../domain/value-objects/breadth-date';

interface MembershipRow {
  symbol: string;
}

interface AggregateRow {
  id: string;
  date: string;
  universe_size: number;
  new_highs: number;
  new_lows: number;
  missing_symbols: string[];
  partial: boolean;
  backfilled: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MarketBreadthRepositoryImpl implements MarketBreadthRepository {
  constructor(private readonly db: DatabaseService) {}

  async saveMembership(date: BreadthDate, symbols: string[]): Promise<void> {
    if (symbols.length === 0) {
      return;
    }

    const dateStr = date.toISOString();

    await this.db.transaction(async (client) => {
      const batchSize = 500;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const values: string[] = [];
        const params: unknown[] = [];

        batch.forEach((symbol, idx) => {
          const base = idx * 3;
          values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
          params.push(crypto.randomUUID(), dateStr, symbol);
        });

        await client.query(
          `INSERT INTO market_breadth_universe_membership (id, scan_date, symbol)
           VALUES ${values.join(', ')}
           ON CONFLICT (scan_date, symbol) DO NOTHING`,
          params,
        );
      }
    });
  }

  async getMembership(date: BreadthDate): Promise<string[]> {
    const result = (await this.db.query(
      `SELECT symbol FROM market_breadth_universe_membership WHERE scan_date = $1`,
      [date.toISOString()],
    )) as { rows: MembershipRow[] };

    return result.rows.map((row) => row.symbol);
  }

  async saveAggregate(aggregate: MarketBreadthAggregate): Promise<void> {
    await this.db.query(
      `INSERT INTO market_breadth_daily_aggregates
        (id, date, universe_size, new_highs, new_lows, missing_symbols, partial, backfilled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (date) DO UPDATE SET
         universe_size = EXCLUDED.universe_size,
         new_highs = EXCLUDED.new_highs,
         new_lows = EXCLUDED.new_lows,
         missing_symbols = EXCLUDED.missing_symbols,
         partial = EXCLUDED.partial,
         backfilled = EXCLUDED.backfilled,
         updated_at = NOW()`,
      [
        aggregate.id,
        aggregate.date.toISOString(),
        aggregate.universeSize,
        aggregate.newHighs,
        aggregate.newLows,
        JSON.stringify(aggregate.missingSymbols),
        aggregate.partial,
        aggregate.backfilled,
        aggregate.createdAt,
      ],
    );
  }

  async getRecentAggregates(limit: number): Promise<MarketBreadthAggregate[]> {
    const result = (await this.db.query(
      `SELECT * FROM market_breadth_daily_aggregates
       ORDER BY date DESC
       LIMIT $1`,
      [limit],
    )) as { rows: AggregateRow[] };

    return result.rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: AggregateRow): MarketBreadthAggregate {
    return MarketBreadthAggregate.fromData({
      id: row.id,
      date: BreadthDate.of(new Date(row.date)),
      universeSize: row.universe_size,
      newHighs: row.new_highs,
      newLows: row.new_lows,
      missingSymbols: row.missing_symbols ?? [],
      partial: row.partial,
      backfilled: row.backfilled,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
