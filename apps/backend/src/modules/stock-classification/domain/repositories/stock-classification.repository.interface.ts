import { StockClassification } from '../entities/stock-classification.entity';

export interface StockClassificationRepository {
  findByTicker(ticker: string): Promise<StockClassification | null>;
  save(classification: StockClassification): Promise<void>;

  /**
   * Bulk lookup of industry-group labels for a list of tickers. Returns a
   * Map keyed by uppercase ticker → industry_group (or null if the row
   * exists but its industry_group column is NULL). Tickers absent from
   * the table are simply omitted from the map.
   */
  findGroupsForTickers(tickers: string[]): Promise<Map<string, string | null>>;
}
