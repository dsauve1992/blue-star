import type {
  BrokerOrder,
  BrokerPosition,
  Execution,
} from './brokerage.service';
import { buildTradingJournal } from './trading-journal';
import { BrokerAccountId } from '../value-objects/broker-account-id';
import { BrokerOrderId } from '../value-objects/broker-order-id';

const ACCOUNT = BrokerAccountId.of('DU1234567');

function execution(
  overrides: Partial<Execution> &
    Pick<Execution, 'side' | 'quantity' | 'price'>,
): Execution {
  return {
    accountId: ACCOUNT,
    executionId: `exec-${Math.random()}`,
    orderId: null,
    ticker: 'KOD',
    instrumentId: '4815',
    commission: 0,
    executedAt: new Date('2026-11-16T15:00:00Z'),
    ...overrides,
  };
}

function stopOrder(overrides: Partial<BrokerOrder>): BrokerOrder {
  return {
    accountId: ACCOUNT,
    orderId: BrokerOrderId.of('900'),
    ticker: 'KOD',
    instrumentId: '4815',
    side: 'SELL',
    type: 'STOP',
    quantity: 10,
    remainingQuantity: 10,
    limitPrice: null,
    stopPrice: 95,
    timeInForce: 'GTC',
    status: 'PreSubmitted',
    isWorking: true,
    ocaGroupId: null,
    ...overrides,
  };
}

function position(overrides: Partial<BrokerPosition>): BrokerPosition {
  return {
    accountId: ACCOUNT,
    ticker: 'KOD',
    instrumentId: '4815',
    quantity: 10,
    averageCost: 100,
    marketPrice: 106,
    marketValue: 1060,
    unrealizedPnl: 60,
    currency: 'USD',
    ...overrides,
  };
}

describe('buildTradingJournal', () => {
  it('should measure a campaign closed by its stop in R', () => {
    const journal = buildTradingJournal({
      positions: [],
      executions: [
        execution({
          side: 'BUY',
          quantity: 10,
          price: 100,
          commission: 1,
          executedAt: new Date('2026-11-16T15:00:00Z'),
        }),
        execution({
          side: 'SELL',
          quantity: 10,
          price: 94.9,
          commission: 1,
          orderId: '900',
          executedAt: new Date('2026-11-17T15:00:00Z'),
        }),
      ],
      ordersOfTheDay: [
        stopOrder({ status: 'Filled', isWorking: false, remainingQuantity: 0 }),
      ],
    });

    expect(journal.campaigns).toEqual([
      {
        ticker: 'KOD',
        instrumentId: '4815',
        direction: 'LONG',
        status: 'CLOSED',
        openedAt: new Date('2026-11-16T15:00:00Z'),
        closedAt: new Date('2026-11-17T15:00:00Z'),
        quantity: 10,
        averageEntryPrice: 100,
        averageExitPrice: 94.9,
        pnl: expect.closeTo(-53, 6) as number,
        stopPrice: 95,
        stopSource: 'STOP_FILL',
        initialRisk: 50,
        rMultiple: expect.closeTo(-1.06, 6) as number,
      },
    ]);
  });

  it('should ignore fills of a campaign that began before the window', () => {
    const journal = buildTradingJournal({
      positions: [],
      executions: [execution({ side: 'SELL', quantity: 10, price: 120 })],
      ordersOfTheDay: [],
    });

    expect(journal.campaigns).toEqual([]);
    expect(journal.stats.closedCampaigns).toBe(0);
  });

  it('should measure an open position against its working stop', () => {
    const journal = buildTradingJournal({
      positions: [position({})],
      executions: [
        execution({
          side: 'BUY',
          quantity: 10,
          price: 100,
          executedAt: new Date('2026-11-18T15:00:00Z'),
        }),
      ],
      ordersOfTheDay: [stopOrder({})],
    });

    expect(journal.campaigns).toEqual([
      {
        ticker: 'KOD',
        instrumentId: '4815',
        direction: 'LONG',
        status: 'OPEN',
        openedAt: new Date('2026-11-18T15:00:00Z'),
        closedAt: null,
        quantity: 10,
        averageEntryPrice: 100,
        averageExitPrice: null,
        pnl: 60,
        stopPrice: 95,
        stopSource: 'WORKING_STOP',
        initialRisk: 50,
        rMultiple: 1.2,
      },
    ]);
  });

  it('should leave R unknown once the stop is raised above the entry', () => {
    const journal = buildTradingJournal({
      positions: [position({})],
      executions: [],
      ordersOfTheDay: [stopOrder({ stopPrice: 101 })],
    });

    expect(journal.campaigns[0]).toMatchObject({
      stopPrice: 101,
      initialRisk: null,
      rMultiple: null,
    });
  });

  it('should compute win rate, average R:R and expectancy over closed campaigns with R', () => {
    const roundTrip = (
      instrumentId: string,
      exitPrice: number,
      stopPrice: number,
    ) => ({
      executions: [
        execution({ instrumentId, side: 'BUY', quantity: 10, price: 100 }),
        execution({
          instrumentId,
          side: 'SELL',
          quantity: 10,
          price: exitPrice,
          orderId: instrumentId,
          executedAt: new Date('2026-11-17T15:00:00Z'),
        }),
      ],
      order: stopOrder({
        orderId: BrokerOrderId.of(instrumentId),
        instrumentId,
        stopPrice,
        status: 'Filled',
        isWorking: false,
      }),
    });
    const trips = [
      roundTrip('1', 120, 95),
      roundTrip('2', 95, 95),
      roundTrip('3', 110, 95),
    ];
    const unknownR = [
      execution({ instrumentId: '4', side: 'BUY', quantity: 1, price: 50 }),
      execution({ instrumentId: '4', side: 'SELL', quantity: 1, price: 40 }),
    ];

    const { stats } = buildTradingJournal({
      positions: [],
      executions: [...trips.flatMap((trip) => trip.executions), ...unknownR],
      ordersOfTheDay: trips.map((trip) => trip.order),
    });

    expect(stats).toEqual({
      closedCampaigns: 4,
      campaignsWithR: 3,
      wins: 2,
      losses: 1,
      winRate: 2 / 3,
      averageWinR: 3,
      averageLossR: -1,
      averageRewardToRisk: 3,
      expectancyR: 5 / 3,
      totalR: 5,
      largestWinR: 4,
      largestLossR: -1,
      profitFactor: 6,
      realizedPnl: 200 - 50 + 100 - 10,
    });
  });
});
