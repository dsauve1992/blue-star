import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { Symbol } from '../../domain/value-objects/symbol';
import { PricePoint } from '../../domain/value-objects/price-point';
import { MarketDataCacheRepository } from '../../domain/repositories/market-data-cache.repository.interface';
import { Interval } from '../../domain/services/market-data.service';

interface CacheRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class MarketDataCacheRepositoryImpl
  implements MarketDataCacheRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async findBySymbolAndDateRange(
    symbol: Symbol,
    startDate: Date,
    endDate: Date,
    interval: Interval,
  ): Promise<PricePoint[]> {
    const query = `
      SELECT date, open, high, low, close, volume
      FROM market_data_cache
      WHERE symbol = $1
        AND interval = $2
        AND date >= $3
        AND date <= $4
      ORDER BY date ASC
    `;

    const result = await this.databaseService.query(query, [
      symbol.value,
      interval,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);

    return result.rows.map((row: CacheRow) =>
      PricePoint.of(
        new Date(row.date),
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume,
      ),
    );
  }

  async savePricePoints(
    symbol: Symbol,
    pricePoints: PricePoint[],
    interval: Interval,
  ): Promise<void> {
    if (pricePoints.length === 0) {
      return;
    }

    await this.databaseService.transaction(async (client) => {
      for (const pricePoint of pricePoints) {
        const dateStr = pricePoint.date.toISOString().split('T')[0];
        await client.query(
          `INSERT INTO market_data_cache (symbol, interval, date, open, high, low, close, volume, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (symbol, interval, date) DO UPDATE SET
             open = EXCLUDED.open,
             high = EXCLUDED.high,
             low = EXCLUDED.low,
             close = EXCLUDED.close,
             volume = EXCLUDED.volume,
             updated_at = NOW()`,
          [
            symbol.value,
            interval,
            dateStr,
            pricePoint.open,
            pricePoint.high,
            pricePoint.low,
            pricePoint.close,
            pricePoint.volume,
          ],
        );
      }
    });
  }
}

