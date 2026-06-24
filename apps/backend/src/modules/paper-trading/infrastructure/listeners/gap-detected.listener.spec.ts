import { GapDetectedListener } from './gap-detected.listener';
import { OpenPaperTradeUseCase } from '../../use-cases/open-paper-trade.use-case';
import { GapDetectedEvent } from '../../../watchlist-monitoring/domain/events/gap-detected.event';
import { LocalDate } from '../../../watchlist-monitoring/domain/value-objects/local-date';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';

describe('GapDetectedListener', () => {
  let listener: GapDetectedListener;
  let openPaperTrade: jest.Mocked<OpenPaperTradeUseCase>;

  beforeEach(() => {
    openPaperTrade = {
      execute: jest.fn().mockResolvedValue({ opened: true, tradeId: 'pt-1' }),
    } as unknown as jest.Mocked<OpenPaperTradeUseCase>;
    listener = new GapDetectedListener(openPaperTrade);
  });

  function event(): GapDetectedEvent {
    return new GapDetectedEvent(
      WatchlistTicker.of('AAPL'),
      WatchlistId.of('wl-123'),
      'Momentum',
      LocalDate.fromKey('2026-06-24'),
      new Date('2026-06-24T13:35:00.000Z'),
      108,
      100,
    );
  }

  it('maps the gap event onto an open-paper-trade request', async () => {
    await listener.handle(event());

    expect(openPaperTrade.execute).toHaveBeenCalledTimes(1);
    const request = openPaperTrade.execute.mock.calls[0][0];
    expect(request.ticker.value).toBe('AAPL');
    expect(request.entryPrice).toBe(108);
    expect(request.stopPrice).toBe(100);
    expect(request.marketDate).toBe('2026-06-24');
    expect(request.openedAt).toEqual(new Date('2026-06-24T13:35:00.000Z'));
  });

  it('swallows use-case errors so the event pipeline is not broken', async () => {
    openPaperTrade.execute.mockRejectedValue(new Error('db down'));

    await expect(listener.handle(event())).resolves.toBeUndefined();
  });
});
