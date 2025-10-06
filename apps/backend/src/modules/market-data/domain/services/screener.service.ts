import { ScreenerFilters } from '../value-objects/screener-filters';
import { ScreenerResult } from '../value-objects/screener-result';

export interface ScreenerService {
  screenStocks(filters: ScreenerFilters): Promise<ScreenerResult[]>;
}
