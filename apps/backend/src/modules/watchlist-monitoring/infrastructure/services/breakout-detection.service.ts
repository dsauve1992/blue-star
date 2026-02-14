import { Injectable } from '@nestjs/common';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { HistoricalData } from '../../../market-data/domain/services/market-data.service';
import {
  BreakoutDetectionResult,
  BreakoutDetectionService as IBreakoutDetectionService,
} from '../../domain/services/breakout-detection.service';

@Injectable()
export class BreakoutDetectionServiceImpl implements IBreakoutDetectionService {
  // Placeholder: breakout detection algorithm to be implemented
  detect(
    ticker: WatchlistTicker,
    historicalData: HistoricalData,
  ): BreakoutDetectionResult {
    void historicalData;
    return {
      ticker,
      detected: false,
    };
  }
}
