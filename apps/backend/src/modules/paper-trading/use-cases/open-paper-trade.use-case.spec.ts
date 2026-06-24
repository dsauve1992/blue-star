import { OpenPaperTradeUseCase } from './open-paper-trade.use-case';
import type { PaperTradeReadRepository } from '../domain/repositories/paper-trade-read.repository.interface';
import type { PaperTradeWriteRepository } from '../domain/repositories/paper-trade-write.repository.interface';
import { WatchlistTicker } from '../../watchlist/domain/value-objects/watchlist-ticker';

describe('OpenPaperTradeUseCase', () => {
  let useCase: OpenPaperTradeUseCase;
  let readRepository: jest.Mocked<PaperTradeReadRepository>;
  let writeRepository: jest.Mocked<PaperTradeWriteRepository>;

  const ticker = WatchlistTicker.of('AAPL');

  beforeEach(() => {
    readRepository = {
      findById: jest.fn(),
      findOpen: jest.fn(),
      hasOpenTrade: jest.fn().mockResolvedValue(false),
      list: jest.fn(),
      getRealizedPnl: jest.fn().mockResolvedValue(0),
      getCommittedCash: jest.fn().mockResolvedValue(0),
    };
    writeRepository = { save: jest.fn().mockResolvedValue(undefined) };
    useCase = new OpenPaperTradeUseCase(readRepository, writeRepository);
  });

  function request(
    overrides: Partial<{ entryPrice: number; stopPrice: number }> = {},
  ) {
    const { entryPrice = 108, stopPrice = 100 } = overrides;
    return {
      ticker,
      entryPrice,
      stopPrice,
      marketDate: '2026-06-24',
      openedAt: new Date('2026-06-24T13:35:00.000Z'),
    };
  }

  it('sizes shares from 0.5% of starting equity and sets a 6R target', async () => {
    // equity 10_000, risk 0.5% = $50, riskPerShare = 8 -> floor(50/8) = 6 shares
    // cash cap: floor(10_000 / 108) = 92 -> risk is the binding constraint
    const result = await useCase.execute(request());

    expect(result.opened).toBe(true);
    expect(writeRepository.save).toHaveBeenCalledTimes(1);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(6);
    expect(saved.targetPrice).toBe(156); // 108 + 6 * 8
    expect(saved.riskPerShare).toBe(8);
  });

  it('compounds equity from realized pnl when sizing', async () => {
    // realized +2000 -> equity 12_000, risk 0.5% = $60, floor(60/8) = 7 shares
    readRepository.getRealizedPnl.mockResolvedValue(2000);

    const result = await useCase.execute(request());

    expect(result.opened).toBe(true);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(7);
  });

  it('caps shares at available cash net of committed capital', async () => {
    // entry 108, stop 107.9 -> riskPerShare = 0.1, riskBudget 50 -> 500 shares by risk
    // but availableCash = 10_000 - 9_500 committed = 500 -> floor(500/108) = 4 shares
    readRepository.getCommittedCash.mockResolvedValue(9500);

    const result = await useCase.execute(
      request({ entryPrice: 108, stopPrice: 107.9 }),
    );

    expect(result.opened).toBe(true);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(4);
  });

  it('skips when an open trade already exists for the ticker', async () => {
    readRepository.hasOpenTrade.mockResolvedValue(true);

    const result = await useCase.execute(request());

    expect(result.opened).toBe(false);
    expect(writeRepository.save).not.toHaveBeenCalled();
  });

  it('skips when risk per share is not positive', async () => {
    const result = await useCase.execute(
      request({ entryPrice: 100, stopPrice: 100 }),
    );

    expect(result.opened).toBe(false);
    expect(readRepository.hasOpenTrade).not.toHaveBeenCalled();
    expect(writeRepository.save).not.toHaveBeenCalled();
  });

  it('skips when available cash cannot afford a single share', async () => {
    // all equity committed -> availableCash 0 -> shareCount < 1
    readRepository.getCommittedCash.mockResolvedValue(10000);

    const result = await useCase.execute(request());

    expect(result.opened).toBe(false);
    expect(writeRepository.save).not.toHaveBeenCalled();
  });
});
