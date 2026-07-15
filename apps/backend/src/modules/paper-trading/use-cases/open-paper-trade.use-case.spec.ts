import { OpenPaperTradeUseCase } from './open-paper-trade.use-case';
import type { PaperTradeReadRepository } from '../domain/repositories/paper-trade-read.repository.interface';
import type { PaperTradeWriteRepository } from '../domain/repositories/paper-trade-write.repository.interface';
import type { PaperTradeContext } from '../domain/entities/paper-trade';
import { WatchlistTicker } from '../../watchlist/domain/value-objects/watchlist-ticker';

describe('OpenPaperTradeUseCase', () => {
  let useCase: OpenPaperTradeUseCase;
  let readRepository: jest.Mocked<PaperTradeReadRepository>;
  let writeRepository: jest.Mocked<PaperTradeWriteRepository>;

  const ticker = WatchlistTicker.of('AAPL');

  const context: PaperTradeContext = {
    industryGroup: 'Software & Services',
    globalRsRating: 95,
    industryGroupRsRating: 80,
    industryGroupQuadrant: 'Leading',
  };

  beforeEach(() => {
    readRepository = {
      findById: jest.fn(),
      findOpen: jest.fn(),
      hasOpenTrade: jest.fn().mockResolvedValue(false),
      list: jest.fn(),
      getRealizedPnl: jest.fn().mockResolvedValue(0),
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
      context,
    };
  }

  it('sizes shares from 0.5% of starting equity and sets a 6R target', async () => {
    // equity 10_000, risk 0.5% = $50, riskPerShare = 8 -> floor(50/8) = 6 shares
    const result = await useCase.execute(request());

    expect(result.opened).toBe(true);
    expect(writeRepository.save).toHaveBeenCalledTimes(1);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(6);
    expect(saved.targetPrice).toBe(156); // 108 + 6 * 8
    expect(saved.riskPerShare).toBe(8);
    expect(saved.context).toEqual(context);
  });

  it('compounds equity from realized pnl when sizing', async () => {
    // realized +2000 -> equity 12_000, risk 0.5% = $60, floor(60/8) = 7 shares
    readRepository.getRealizedPnl.mockResolvedValue(2000);

    const result = await useCase.execute(request());

    expect(result.opened).toBe(true);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(7);
  });

  it('sizes purely from the risk budget regardless of open committed capital', async () => {
    // riskPerShare = 0.755, riskBudget = 50 -> floor(50/0.755) = 66 shares,
    // independent of how much cash is tied up in other open positions
    const result = await useCase.execute(
      request({ entryPrice: 15.055, stopPrice: 14.3 }),
    );

    expect(result.opened).toBe(true);
    const saved = writeRepository.save.mock.calls[0][0];
    expect(saved.shares.value).toBe(66);
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

  it('skips when the risk budget cannot afford a single share', async () => {
    // riskPerShare 60 > riskBudget 50 -> floor(50/60) = 0 shares
    const result = await useCase.execute(
      request({ entryPrice: 160, stopPrice: 100 }),
    );

    expect(result.opened).toBe(false);
    expect(writeRepository.save).not.toHaveBeenCalled();
  });
});
