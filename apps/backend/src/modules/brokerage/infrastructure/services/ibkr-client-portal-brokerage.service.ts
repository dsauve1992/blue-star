import { Injectable } from '@nestjs/common';
import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import {
  BracketOrder,
  BrokerageService,
  BrokerPosition,
  Execution,
  OrderChanges,
  OrderSide,
  OrderSubmission,
  OrderType,
  BrokerOrder,
} from '../../domain/services/brokerage.service';
import {
  BrokerRejectedError,
  BrokerUnavailableError,
  InvariantError,
} from '../../domain/domain-errors';
import { BrokerAccountId } from '../../domain/value-objects/broker-account-id';
import { BrokerOrderId } from '../../domain/value-objects/broker-order-id';
import { OrderReplyId } from '../../domain/value-objects/order-reply-id';
import { IbkrGatewayClient } from './ibkr-gateway.client';

const ALL_ACCOUNTS_PSEUDO_ID = 'All';
const POSITIONS_PAGE_SIZE = 100;
const MAX_POSITION_PAGES = 10;
const EXECUTION_LOOKBACK_DAYS = 7;
const WORKING_STATUSES = new Set([
  'PendingSubmit',
  'PreSubmitted',
  'Submitted',
]);

type IbkrNumber = number | string | null | undefined;

interface IbkrAuthStatus {
  authenticated?: boolean;
}

interface IbkrAccounts {
  accounts?: string[];
}

interface IbkrPosition {
  acctId: string;
  conid: number;
  contractDesc?: string;
  ticker?: string;
  position: IbkrNumber;
  avgCost: IbkrNumber;
  mktPrice: IbkrNumber;
  mktValue: IbkrNumber;
  unrealizedPnl: IbkrNumber;
  currency: string;
}

interface IbkrOrder {
  acct: string;
  orderId: number | string;
  conid: number | string;
  ticker: string;
  side: string;
  orderType: string;
  totalSize: IbkrNumber;
  remainingQuantity: IbkrNumber;
  price?: IbkrNumber;
  auxPrice?: IbkrNumber;
  timeInForce: string;
  status: string;
  ocaGroupId?: string | number;
}

interface IbkrTrade {
  execution_id: string;
  order_id?: number | string;
  account: string;
  symbol: string;
  conid: number | string;
  side: string;
  size: IbkrNumber;
  price: IbkrNumber;
  commission?: IbkrNumber;
  trade_time_r: number;
}

interface IbkrStockEntry {
  contracts?: { conid: number; isUS?: boolean }[];
}

type IbkrOrderReply =
  | { order_id: number | string; order_status?: string }
  | { id: string; message: string[] }
  | { error: string };

interface IbkrOrderTicket {
  acctId: string;
  conid: number;
  cOID?: string;
  parentId?: string;
  orderType: 'MKT' | 'LMT' | 'STP';
  side: OrderSide;
  quantity: number;
  tif: string;
  price?: number;
}

@Injectable()
export class IbkrClientPortalBrokerageService implements BrokerageService {
  constructor(private readonly gateway: IbkrGatewayClient) {}

  async listAccounts(): Promise<BrokerAccountId[]> {
    await this.ensureBrokerageSession();
    const response = await this.gateway.request<IbkrAccounts>(
      'GET',
      '/iserver/accounts',
    );
    return (response.accounts ?? [])
      .filter((id) => id !== ALL_ACCOUNTS_PSEUDO_ID)
      .map((id) => BrokerAccountId.of(id));
  }

  async getPositions(accountId: BrokerAccountId): Promise<BrokerPosition[]> {
    await this.gateway.request('GET', '/portfolio/accounts');

    const positions: IbkrPosition[] = [];
    for (let page = 0; page < MAX_POSITION_PAGES; page++) {
      const rows = await this.gateway.request<IbkrPosition[] | null>(
        'GET',
        `/portfolio/${accountId.value}/positions/${page}`,
      );
      positions.push(...(rows ?? []));
      if (!rows || rows.length < POSITIONS_PAGE_SIZE) {
        break;
      }
    }

    return positions
      .filter((row) => toNumber(row.position) !== 0)
      .map((row) => ({
        accountId,
        ticker: row.ticker ?? row.contractDesc ?? String(row.conid),
        instrumentId: String(row.conid),
        quantity: toNumber(row.position) ?? 0,
        averageCost: toNumber(row.avgCost) ?? 0,
        marketPrice: toNumber(row.mktPrice) ?? 0,
        marketValue: toNumber(row.mktValue) ?? 0,
        unrealizedPnl: toNumber(row.unrealizedPnl) ?? 0,
        currency: row.currency,
      }));
  }

  async getWorkingOrders(accountId: BrokerAccountId): Promise<BrokerOrder[]> {
    const orders = await this.getOrdersOfTheDay(accountId);
    return orders.filter((order) => order.isWorking);
  }

  async getOrdersOfTheDay(accountId: BrokerAccountId): Promise<BrokerOrder[]> {
    await this.ensureBrokerageSession();
    const response = await this.gateway.request<{
      orders?: IbkrOrder[];
      snapshot?: boolean;
    }>('GET', '/iserver/account/orders');
    if (response.snapshot !== true) {
      throw new BrokerUnavailableError(
        'IBKR is still loading the orders of this session: retry in a few seconds',
      );
    }

    return (response.orders ?? [])
      .filter((order) => order.acct === accountId.value)
      .map((order) => toBrokerOrder(accountId, order));
  }

  async getExecutions(accountId: BrokerAccountId): Promise<Execution[]> {
    await this.ensureBrokerageSession();
    const trades = await this.gateway.request<IbkrTrade[] | null>(
      'GET',
      `/iserver/account/trades?days=${EXECUTION_LOOKBACK_DAYS}`,
    );

    return (trades ?? [])
      .filter((trade) => trade.account === accountId.value)
      .map((trade) => ({
        accountId,
        executionId: trade.execution_id,
        orderId: trade.order_id === undefined ? null : String(trade.order_id),
        ticker: trade.symbol,
        instrumentId: String(trade.conid),
        side: toSide(trade.side),
        quantity: toNumber(trade.size) ?? 0,
        price: toNumber(trade.price) ?? 0,
        commission: toNumber(trade.commission),
        executedAt: new Date(trade.trade_time_r),
      }));
  }

  async placeBracketOrder(order: BracketOrder): Promise<OrderSubmission> {
    await this.ensureBrokerageSession();
    const conid = await this.resolveUsStockConid(order.ticker);
    const parentOrderRef = `bs-${UuidGeneratorService.generate()}`;
    const exitSide: OrderSide = order.side === 'BUY' ? 'SELL' : 'BUY';
    const common = {
      acctId: order.accountId.value,
      conid,
      quantity: order.quantity.value,
      tif: order.timeInForce,
    };

    const tickets: IbkrOrderTicket[] = [
      {
        ...common,
        cOID: parentOrderRef,
        orderType: ENTRY_ORDER_TYPES[order.entryType],
        side: order.side,
        ...(order.entryPrice ? { price: order.entryPrice.value } : {}),
      },
      {
        ...common,
        parentId: parentOrderRef,
        orderType: 'STP',
        side: exitSide,
        price: order.stopLossPrice.value,
      },
    ];
    if (order.takeProfitPrice) {
      tickets.push({
        ...common,
        parentId: parentOrderRef,
        orderType: 'LMT',
        side: exitSide,
        price: order.takeProfitPrice.value,
      });
    }

    const reply = await this.gateway.request<IbkrOrderReply[] | IbkrOrderReply>(
      'POST',
      `/iserver/account/${order.accountId.value}/orders`,
      { orders: tickets },
    );
    return toSubmission(reply);
  }

  async confirmOrder(replyId: OrderReplyId): Promise<OrderSubmission> {
    await this.ensureBrokerageSession();
    const reply = await this.gateway.request<IbkrOrderReply[] | IbkrOrderReply>(
      'POST',
      `/iserver/reply/${replyId.value}`,
      { confirmed: true },
    );
    return toSubmission(reply);
  }

  async modifyOrder(
    order: BrokerOrder,
    changes: OrderChanges,
  ): Promise<OrderSubmission> {
    await this.ensureBrokerageSession();
    const ticket: IbkrOrderTicket = {
      acctId: order.accountId.value,
      conid: Number(order.instrumentId),
      orderType: modifiableOrderType(order.type),
      side: order.side,
      quantity: changes.quantity?.value ?? order.quantity,
      tif: order.timeInForce,
      ...modifiedPrice(order, changes),
    };

    const reply = await this.gateway.request<IbkrOrderReply[] | IbkrOrderReply>(
      'POST',
      `/iserver/account/${order.accountId.value}/order/${order.orderId.value}`,
      ticket,
    );
    return toSubmission(reply);
  }

  async cancelOrder(
    accountId: BrokerAccountId,
    orderId: BrokerOrderId,
  ): Promise<void> {
    await this.ensureBrokerageSession();
    const reply = await this.gateway.request<{ error?: string } | null>(
      'DELETE',
      `/iserver/account/${accountId.value}/order/${orderId.value}`,
    );
    if (reply?.error) {
      throw new BrokerRejectedError(`IBKR rejected the cancel: ${reply.error}`);
    }
  }

  private async ensureBrokerageSession(): Promise<void> {
    if (await this.isBrokerageSessionAuthenticated()) {
      return;
    }
    await this.gateway.request('POST', '/iserver/auth/ssodh/init', {
      publish: true,
      compete: true,
    });
    if (!(await this.isBrokerageSessionAuthenticated())) {
      throw new BrokerUnavailableError(
        'The IBKR brokerage session could not be opened: log in to the gateway again',
      );
    }
  }

  private async isBrokerageSessionAuthenticated(): Promise<boolean> {
    const status = await this.gateway.request<IbkrAuthStatus>(
      'POST',
      '/iserver/auth/status',
      {},
    );
    return status.authenticated === true;
  }

  private async resolveUsStockConid(ticker: Symbol): Promise<number> {
    const symbol = ticker.value.includes(':')
      ? ticker.value.split(':')[1]
      : ticker.value;
    const response = await this.gateway.request<
      Record<string, IbkrStockEntry[]>
    >('GET', `/trsrv/stocks?symbols=${encodeURIComponent(symbol)}`);

    const usContracts = (response[symbol] ?? [])
      .flatMap((entry) => entry.contracts ?? [])
      .filter((contract) => contract.isUS === true);
    if (usContracts.length !== 1) {
      throw new InvariantError(
        `Expected exactly one US stock for ${symbol}, found ${usContracts.length}`,
      );
    }
    return usContracts[0].conid;
  }
}

const ENTRY_ORDER_TYPES: Record<
  BracketOrder['entryType'],
  IbkrOrderTicket['orderType']
> = {
  MARKET: 'MKT',
  LIMIT: 'LMT',
  STOP: 'STP',
};

function toBrokerOrder(
  accountId: BrokerAccountId,
  order: IbkrOrder,
): BrokerOrder {
  const type = toOrderType(order.orderType);
  return {
    accountId,
    orderId: BrokerOrderId.of(String(order.orderId)),
    ticker: order.ticker,
    instrumentId: String(order.conid),
    side: toSide(order.side),
    type,
    quantity: toNumber(order.totalSize) ?? 0,
    remainingQuantity: toNumber(order.remainingQuantity) ?? 0,
    limitPrice:
      type === 'LIMIT' || type === 'STOP_LIMIT' ? toNumber(order.price) : null,
    stopPrice:
      type === 'STOP' || type === 'STOP_LIMIT'
        ? toNumber(order.auxPrice)
        : null,
    timeInForce: toTimeInForce(order.timeInForce),
    status: order.status,
    isWorking: WORKING_STATUSES.has(order.status),
    ocaGroupId:
      order.ocaGroupId === undefined ? null : String(order.ocaGroupId),
  };
}

function toOrderType(raw: string): OrderType {
  const normalized = raw.toUpperCase().replace(/[\s_]/g, '');
  if (normalized === 'STOPLIMIT' || normalized === 'STPLMT')
    return 'STOP_LIMIT';
  if (normalized === 'STOP' || normalized === 'STP') return 'STOP';
  if (normalized === 'LIMIT' || normalized === 'LMT') return 'LIMIT';
  if (normalized === 'MARKET' || normalized === 'MKT') return 'MARKET';
  return 'OTHER';
}

function toTimeInForce(raw: string): string {
  return raw === 'CLOSE' ? 'DAY' : raw;
}

function toSide(raw: string): OrderSide {
  const normalized = raw.toUpperCase();
  if (normalized === 'BUY' || normalized === 'B') return 'BUY';
  if (normalized === 'SELL' || normalized === 'S') return 'SELL';
  throw new Error(`Unknown IBKR order side: ${raw}`);
}

function toNumber(value: IbkrNumber): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function modifiableOrderType(type: OrderType): IbkrOrderTicket['orderType'] {
  if (type === 'STOP') return 'STP';
  if (type === 'LIMIT') return 'LMT';
  if (type === 'MARKET') return 'MKT';
  throw new InvariantError(`A ${type} order cannot be modified here`);
}

function modifiedPrice(
  order: BrokerOrder,
  changes: OrderChanges,
): { price?: number } {
  if (order.type === 'MARKET') {
    if (changes.price) {
      throw new InvariantError('A market order has no price to modify');
    }
    return {};
  }
  const currentPrice =
    order.type === 'STOP' ? order.stopPrice : order.limitPrice;
  const price = changes.price?.value ?? currentPrice;
  if (price === null) {
    throw new InvariantError(
      `Order ${order.orderId.value} has no current price`,
    );
  }
  return { price };
}

function toSubmission(
  reply: IbkrOrderReply[] | IbkrOrderReply,
): OrderSubmission {
  const items = Array.isArray(reply) ? reply : [reply];

  const rejection = items.find((item) => 'error' in item);
  if (rejection && 'error' in rejection) {
    throw new BrokerRejectedError(
      `IBKR rejected the order: ${rejection.error}`,
    );
  }

  const prompt = items.find((item) => 'id' in item && 'message' in item);
  if (prompt && 'id' in prompt) {
    return {
      status: 'CONFIRMATION_REQUIRED',
      replyId: OrderReplyId.of(prompt.id),
      messages: prompt.message,
    };
  }

  const orderIds = items
    .filter((item) => 'order_id' in item)
    .map((item) =>
      BrokerOrderId.of(
        String((item as { order_id: number | string }).order_id),
      ),
    );
  if (orderIds.length === 0) {
    throw new Error(`Unexpected IBKR order reply: ${JSON.stringify(reply)}`);
  }
  return { status: 'SUBMITTED', orderIds };
}
