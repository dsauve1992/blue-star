import {
  PaperTrade,
  PaperTradeContext,
  PaperTradeExitReason,
  PaperTradeStatus,
} from './paper-trade';
import { Shares } from '../value-objects/shares';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';

describe('PaperTrade', () => {
  const ticker = WatchlistTicker.of('AAPL');

  const context: PaperTradeContext = {
    industryGroup: 'Software & Services',
    globalRsRating: 95,
    industryGroupRsRating: 80,
    industryGroupQuadrant: 'Leading',
  };

  function openTrade(
    overrides: Partial<{
      entryPrice: number;
      stopPrice: number;
      targetPrice: number;
      shares: number;
    }> = {},
  ): PaperTrade {
    const {
      entryPrice = 108,
      stopPrice = 100,
      targetPrice = 156,
      shares = 6,
    } = overrides;
    return PaperTrade.open({
      ticker,
      entryPrice,
      stopPrice,
      targetPrice,
      shares: Shares.of(shares),
      marketDate: '2026-06-24',
      openedAt: new Date('2026-06-24T13:35:00.000Z'),
      context,
    });
  }

  it('opens in OPEN status with risk-per-share derived from entry minus stop', () => {
    const trade = openTrade();

    expect(trade.status).toBe(PaperTradeStatus.OPEN);
    expect(trade.isOpen).toBe(true);
    expect(trade.riskPerShare).toBe(8);
    expect(trade.pnl).toBeUndefined();
    expect(trade.realizedR).toBeUndefined();
  });

  it('carries the gap context captured at open', () => {
    const trade = openTrade();

    expect(trade.context).toEqual(context);
  });

  it('rejects opening when stop is at or above entry', () => {
    expect(() => openTrade({ entryPrice: 100, stopPrice: 100 })).toThrow();
    expect(() => openTrade({ entryPrice: 100, stopPrice: 105 })).toThrow();
  });

  it('rejects opening when target is at or below entry', () => {
    expect(() => openTrade({ entryPrice: 108, targetPrice: 108 })).toThrow();
  });

  it('computes pnl and realizedR as -1R when closed at the stop', () => {
    const trade = openTrade();

    trade.close(100, PaperTradeExitReason.STOP, new Date());

    expect(trade.status).toBe(PaperTradeStatus.CLOSED);
    expect(trade.exitReason).toBe(PaperTradeExitReason.STOP);
    expect(trade.realizedR).toBe(-1);
    expect(trade.pnl).toBe(-48); // (100 - 108) * 6
  });

  it('computes pnl and realizedR as +6R when closed at the 6R target', () => {
    const trade = openTrade();

    trade.close(156, PaperTradeExitReason.TARGET, new Date());

    expect(trade.realizedR).toBe(6); // (156 - 108) / 8
    expect(trade.pnl).toBe(288); // (156 - 108) * 6
  });

  it('rejects closing an already-closed trade', () => {
    const trade = openTrade();
    trade.close(156, PaperTradeExitReason.TARGET, new Date());

    expect(() =>
      trade.close(100, PaperTradeExitReason.STOP, new Date()),
    ).toThrow();
  });

  it('round-trips through a snapshot', () => {
    const trade = openTrade();
    trade.close(156, PaperTradeExitReason.TARGET, new Date('2026-06-25'));

    const restored = PaperTrade.fromSnapshot({
      id: trade.id,
      ticker: trade.ticker,
      status: trade.status,
      shares: trade.shares,
      entryPrice: trade.entryPrice,
      stopPrice: trade.stopPrice,
      targetPrice: trade.targetPrice,
      riskPerShare: trade.riskPerShare,
      exitPrice: trade.exitPrice,
      exitReason: trade.exitReason,
      realizedR: trade.realizedR,
      pnl: trade.pnl,
      marketDate: trade.marketDate,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      context: trade.context,
    });

    expect(restored.realizedR).toBe(6);
    expect(restored.pnl).toBe(288);
    expect(restored.exitReason).toBe(PaperTradeExitReason.TARGET);
    expect(restored.context).toEqual(context);
  });
});
