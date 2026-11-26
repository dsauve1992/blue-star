import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { GetHistoricalDataUseCase } from '../../../market-data/market-data.module';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';
import {
  getMarketDateKey,
  MARKET_TIMEZONE,
} from '../../../../shared/utils/market-clock';
import { SessionCalendar } from '../../domain/services/session-calendar.service';
import { SessionDate } from '../../domain/value-objects/session-date';
import { StateError } from '../../domain/domain-errors';

const LOOKBACK_DAYS = 10;
const MARKET_CLOSE_HOUR = 16;

@Injectable()
export class SpySessionCalendar implements SessionCalendar {
  constructor(private readonly getHistoricalData: GetHistoricalDataUseCase) {}

  async lastCompletedSession(): Promise<SessionDate> {
    const now = new Date();
    const { historicalData } = await this.getHistoricalData.execute({
      symbol: Symbol.of('SPY'),
      dateRange: DateRange.of(
        new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
        now,
      ),
      interval: '1d',
    });
    const lastBar = historicalData.pricePoints.at(-1);
    if (!lastBar) {
      throw new StateError('SPY returned no daily bar to date the session');
    }

    const sessionKey = getMarketDateKey(lastBar.date);
    const marketNow = DateTime.fromJSDate(now, { zone: MARKET_TIMEZONE });
    if (
      sessionKey === getMarketDateKey(now) &&
      marketNow.hour < MARKET_CLOSE_HOUR
    ) {
      throw new StateError(
        `The ${sessionKey} session is still open; run the potent scan after the close`,
      );
    }

    return SessionDate.of(sessionKey);
  }
}
