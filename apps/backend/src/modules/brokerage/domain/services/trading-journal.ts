import type {
  BrokerOrder,
  BrokerPosition,
  Execution,
  OrderType,
} from './brokerage.service';

export type CampaignDirection = 'LONG' | 'SHORT';
export type CampaignStatus = 'OPEN' | 'CLOSED';
export type StopSource = 'STOP_FILL' | 'WORKING_STOP';

export interface TradingCampaign {
  ticker: string;
  instrumentId: string;
  direction: CampaignDirection;
  status: CampaignStatus;
  openedAt: Date | null;
  closedAt: Date | null;
  quantity: number;
  averageEntryPrice: number;
  averageExitPrice: number | null;
  pnl: number;
  stopPrice: number | null;
  stopSource: StopSource | null;
  initialRisk: number | null;
  rMultiple: number | null;
}

export interface JournalStats {
  closedCampaigns: number;
  campaignsWithR: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averageWinR: number | null;
  averageLossR: number | null;
  averageRewardToRisk: number | null;
  expectancyR: number | null;
  totalR: number | null;
  largestWinR: number | null;
  largestLossR: number | null;
  profitFactor: number | null;
  realizedPnl: number;
}

export interface TradingJournal {
  campaigns: TradingCampaign[];
  stats: JournalStats;
}

export interface TradingJournalInput {
  positions: BrokerPosition[];
  executions: Execution[];
  ordersOfTheDay: BrokerOrder[];
}

interface Fill {
  execution: Execution;
  signedQuantity: number;
  commission: number;
}

const EPSILON = 1e-9;
const STOP_TYPES: readonly OrderType[] = ['STOP', 'STOP_LIMIT'];

export function buildTradingJournal(
  input: TradingJournalInput,
): TradingJournal {
  const closed: TradingCampaign[] = [];
  const openedAtByInstrument = new Map<string, Date>();

  for (const [instrumentId, executions] of groupByInstrument(
    input.executions,
  )) {
    const position = input.positions.find(
      (candidate) => candidate.instrumentId === instrumentId,
    );
    const { closedFills, openFills } = splitIntoCampaigns(
      executions,
      position?.quantity ?? 0,
    );
    closed.push(
      ...closedFills.map((fills) =>
        toClosedCampaign(fills, input.ordersOfTheDay),
      ),
    );
    if (openFills) {
      openedAtByInstrument.set(instrumentId, openFills[0].execution.executedAt);
    }
  }

  const open = input.positions
    .filter((position) => !isZero(position.quantity))
    .map((position) =>
      toOpenCampaign(
        position,
        input.ordersOfTheDay,
        openedAtByInstrument.get(position.instrumentId) ?? null,
      ),
    );

  const campaigns = [
    ...open,
    ...closed.sort(
      (a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0),
    ),
  ];
  return { campaigns, stats: computeStats(closed) };
}

function groupByInstrument(executions: Execution[]): Map<string, Execution[]> {
  const groups = new Map<string, Execution[]>();
  for (const execution of executions) {
    const group = groups.get(execution.instrumentId) ?? [];
    group.push(execution);
    groups.set(execution.instrumentId, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
  }
  return groups;
}

function splitIntoCampaigns(
  executions: Execution[],
  currentQuantity: number,
): { closedFills: Fill[][]; openFills: Fill[] | null } {
  const netTraded = executions.reduce(
    (sum, execution) => sum + signedQuantity(execution),
    0,
  );
  let running = currentQuantity - netTraded;
  let campaign: Fill[] | null = null;
  const closedFills: Fill[][] = [];

  for (const execution of executions) {
    let remaining = signedQuantity(execution);
    while (!isZero(remaining)) {
      if (isZero(running)) {
        campaign = [];
      }
      const reducesPosition =
        !isZero(running) && Math.sign(remaining) !== Math.sign(running);
      const portion = reducesPosition
        ? Math.sign(remaining) *
          Math.min(Math.abs(remaining), Math.abs(running))
        : remaining;

      campaign?.push({
        execution,
        signedQuantity: portion,
        commission:
          ((execution.commission ?? 0) * Math.abs(portion)) /
          execution.quantity,
      });
      running += portion;
      remaining -= portion;

      if (isZero(running)) {
        if (campaign) {
          closedFills.push(campaign);
        }
        campaign = null;
      }
    }
  }

  return { closedFills, openFills: campaign };
}

function toClosedCampaign(
  fills: Fill[],
  ordersOfTheDay: BrokerOrder[],
): TradingCampaign {
  const direction: CampaignDirection =
    fills[0].signedQuantity > 0 ? 'LONG' : 'SHORT';
  const directionSign = direction === 'LONG' ? 1 : -1;
  const entries = fills.filter(
    (fill) => Math.sign(fill.signedQuantity) === directionSign,
  );
  const exits = fills.filter(
    (fill) => Math.sign(fill.signedQuantity) !== directionSign,
  );

  const quantity = totalQuantity(entries);
  const averageEntryPrice = averagePrice(entries);
  const averageExitPrice = averagePrice(exits);
  const commissions = fills.reduce((sum, fill) => sum + fill.commission, 0);
  const pnl =
    directionSign * (averageExitPrice - averageEntryPrice) * quantity -
    commissions;

  const stopPrice = filledStopPrice(exits, ordersOfTheDay);
  const initialRisk = riskOf(direction, averageEntryPrice, stopPrice, quantity);

  return {
    ticker: fills[0].execution.ticker,
    instrumentId: fills[0].execution.instrumentId,
    direction,
    status: 'CLOSED',
    openedAt: entries[0].execution.executedAt,
    closedAt: exits[exits.length - 1].execution.executedAt,
    quantity,
    averageEntryPrice,
    averageExitPrice,
    pnl,
    stopPrice,
    stopSource: stopPrice === null ? null : 'STOP_FILL',
    initialRisk,
    rMultiple: initialRisk === null ? null : pnl / initialRisk,
  };
}

function toOpenCampaign(
  position: BrokerPosition,
  ordersOfTheDay: BrokerOrder[],
  openedAt: Date | null,
): TradingCampaign {
  const direction: CampaignDirection = position.quantity > 0 ? 'LONG' : 'SHORT';
  const quantity = Math.abs(position.quantity);
  const stopPrice = workingStopPrice(position, direction, ordersOfTheDay);
  const initialRisk = riskOf(
    direction,
    position.averageCost,
    stopPrice,
    quantity,
  );

  return {
    ticker: position.ticker,
    instrumentId: position.instrumentId,
    direction,
    status: 'OPEN',
    openedAt,
    closedAt: null,
    quantity,
    averageEntryPrice: position.averageCost,
    averageExitPrice: null,
    pnl: position.unrealizedPnl,
    stopPrice,
    stopSource: stopPrice === null ? null : 'WORKING_STOP',
    initialRisk,
    rMultiple:
      initialRisk === null ? null : position.unrealizedPnl / initialRisk,
  };
}

function filledStopPrice(
  exits: Fill[],
  ordersOfTheDay: BrokerOrder[],
): number | null {
  for (const exit of exits) {
    const order = ordersOfTheDay.find(
      (candidate) => candidate.orderId.value === exit.execution.orderId,
    );
    if (order && STOP_TYPES.includes(order.type) && order.stopPrice !== null) {
      return order.stopPrice;
    }
  }
  return null;
}

function workingStopPrice(
  position: BrokerPosition,
  direction: CampaignDirection,
  ordersOfTheDay: BrokerOrder[],
): number | null {
  const exitSide = direction === 'LONG' ? 'SELL' : 'BUY';
  const stops = ordersOfTheDay.filter(
    (order) =>
      order.isWorking &&
      order.instrumentId === position.instrumentId &&
      order.side === exitSide &&
      STOP_TYPES.includes(order.type) &&
      order.stopPrice !== null,
  );
  const stopQuantity = stops.reduce(
    (sum, order) => sum + order.remainingQuantity,
    0,
  );
  if (stops.length === 0 || isZero(stopQuantity)) {
    return null;
  }
  return (
    stops.reduce(
      (sum, order) => sum + (order.stopPrice ?? 0) * order.remainingQuantity,
      0,
    ) / stopQuantity
  );
}

function riskOf(
  direction: CampaignDirection,
  entryPrice: number,
  stopPrice: number | null,
  quantity: number,
): number | null {
  if (stopPrice === null) {
    return null;
  }
  const riskPerShare =
    direction === 'LONG' ? entryPrice - stopPrice : stopPrice - entryPrice;
  return riskPerShare > EPSILON ? riskPerShare * quantity : null;
}

function computeStats(closed: TradingCampaign[]): JournalStats {
  const rMultiples = closed
    .map((campaign) => campaign.rMultiple)
    .filter((r): r is number => r !== null);
  const wins = rMultiples.filter((r) => r > 0);
  const losses = rMultiples.filter((r) => r < 0);
  const grossWinR = sum(wins);
  const grossLossR = Math.abs(sum(losses));
  const averageWinR = mean(wins);
  const averageLossR = mean(losses);

  return {
    closedCampaigns: closed.length,
    campaignsWithR: rMultiples.length,
    wins: wins.length,
    losses: losses.length,
    winRate: rMultiples.length === 0 ? null : wins.length / rMultiples.length,
    averageWinR,
    averageLossR,
    averageRewardToRisk:
      averageWinR === null || averageLossR === null
        ? null
        : averageWinR / Math.abs(averageLossR),
    expectancyR: mean(rMultiples),
    totalR: rMultiples.length === 0 ? null : sum(rMultiples),
    largestWinR: wins.length === 0 ? null : Math.max(...wins),
    largestLossR: losses.length === 0 ? null : Math.min(...losses),
    profitFactor: grossLossR === 0 ? null : grossWinR / grossLossR,
    realizedPnl: sum(closed.map((campaign) => campaign.pnl)),
  };
}

function signedQuantity(execution: Execution): number {
  return execution.side === 'BUY' ? execution.quantity : -execution.quantity;
}

function totalQuantity(fills: Fill[]): number {
  return fills.reduce(
    (total, fill) => total + Math.abs(fill.signedQuantity),
    0,
  );
}

function averagePrice(fills: Fill[]): number {
  const notional = fills.reduce(
    (total, fill) =>
      total + Math.abs(fill.signedQuantity) * fill.execution.price,
    0,
  );
  return notional / totalQuantity(fills);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

function isZero(value: number): boolean {
  return Math.abs(value) < EPSILON;
}
