import { SpySessionCalendar } from './spy-session-calendar.service';
import {
  GetHistoricalDataUseCase,
  PricePoint,
} from '../../../market-data/market-data.module';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';
import { SessionDate } from '../../domain/value-objects/session-date';
import { StateError } from '../../domain/domain-errors';

const bar = (isoDate: string) =>
  PricePoint.of(new Date(isoDate), 100, 101, 99, 100.5, 1_000_000);

describe('SpySessionCalendar', () => {
  let getHistoricalData: { execute: jest.Mock };
  let calendar: SpySessionCalendar;

  const respondWith = (...dates: string[]) =>
    getHistoricalData.execute.mockResolvedValue({
      historicalData: { pricePoints: dates.map(bar) },
    });

  beforeEach(() => {
    getHistoricalData = { execute: jest.fn() };
    calendar = new SpySessionCalendar(
      getHistoricalData as unknown as GetHistoricalDataUseCase,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should date the session from SPY's latest daily bar after the close", async () => {
    jest.useFakeTimers({ now: new Date('2026-11-24T22:50:00.000Z') });
    respondWith('2026-11-23T14:30:00.000Z', '2026-11-24T14:30:00.000Z');

    const session = await calendar.lastCompletedSession();

    expect(session).toEqual(SessionDate.of('2026-11-24'));
    expect(getHistoricalData.execute).toHaveBeenNthCalledWith(1, {
      symbol: Symbol.of('SPY'),
      dateRange: DateRange.of(
        new Date('2026-11-14T22:50:00.000Z'),
        new Date('2026-11-24T22:50:00.000Z'),
      ),
      interval: '1d',
    });
  });

  it('should return the previous session on a market holiday', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-26T22:50:00.000Z') });
    respondWith('2026-11-24T14:30:00.000Z', '2026-11-25T14:30:00.000Z');

    const session = await calendar.lastCompletedSession();

    expect(session).toEqual(SessionDate.of('2026-11-25'));
  });

  it("should refuse while today's session is still open", async () => {
    jest.useFakeTimers({ now: new Date('2026-11-24T17:00:00.000Z') });
    respondWith('2026-11-23T14:30:00.000Z', '2026-11-24T14:30:00.000Z');

    await expect(calendar.lastCompletedSession()).rejects.toThrow(StateError);
  });
});
