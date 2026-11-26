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
const MARKET_OPEN_MINUTE = 9 * 60 + 30;
const MARKET_CLOSE_MINUTE = 16 * 60;
const SATURDAY = 6;

@Injectable()
export class SpySessionCalendar implements SessionCalendar {
  constructor(private readonly getHistoricalData: GetHistoricalDataUseCase) {}

  async lastCompletedSession(): Promise<SessionDate> {
    const now = new Date();
    const marketNow = DateTime.fromJSDate(now, { zone: MARKET_TIMEZONE });
    if (isDuringRegularHours(marketNow)) {
      throw new StateError(
        `The ${getMarketDateKey(now)} session is still open; run the potent scan after the close`,
      );
    }

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

    return SessionDate.of(getMarketDateKey(lastBar.date));
  }
}

function isDuringRegularHours(marketNow: DateTime): boolean {
  const minuteOfDay = marketNow.hour * 60 + marketNow.minute;
  return (
    marketNow.weekday < SATURDAY &&
    minuteOfDay >= MARKET_OPEN_MINUTE &&
    minuteOfDay < MARKET_CLOSE_MINUTE
  );
}
