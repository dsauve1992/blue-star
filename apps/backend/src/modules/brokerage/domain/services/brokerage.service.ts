import { Symbol } from '../../../../shared/value-objects/symbol';
import { BrokerAccountId } from '../value-objects/broker-account-id';
import { BrokerOrderId } from '../value-objects/broker-order-id';
import { OrderPrice } from '../value-objects/order-price';
import { OrderQuantity } from '../value-objects/order-quantity';
import { OrderReplyId } from '../value-objects/order-reply-id';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'OTHER';
export type EntryOrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type TimeInForce = 'DAY' | 'GTC';

export interface BrokerPosition {
  accountId: BrokerAccountId;
  ticker: string;
  instrumentId: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  currency: string;
}

export interface BrokerOrder {
  accountId: BrokerAccountId;
  orderId: BrokerOrderId;
  ticker: string;
  instrumentId: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  remainingQuantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  timeInForce: string;
  status: string;
  isWorking: boolean;
  ocaGroupId: string | null;
}

export interface Execution {
  accountId: BrokerAccountId;
  executionId: string;
  orderId: string | null;
  ticker: string;
  instrumentId: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number | null;
  executedAt: Date;
}

export interface BracketOrder {
  accountId: BrokerAccountId;
  ticker: Symbol;
  side: OrderSide;
  quantity: OrderQuantity;
  entryType: EntryOrderType;
  entryPrice: OrderPrice | null;
  stopLossPrice: OrderPrice;
  takeProfitPrice: OrderPrice | null;
  timeInForce: TimeInForce;
}

export interface OrderChanges {
  price?: OrderPrice;
  quantity?: OrderQuantity;
}

export type OrderSubmission =
  | { status: 'SUBMITTED'; orderIds: BrokerOrderId[] }
  | {
      status: 'CONFIRMATION_REQUIRED';
      replyId: OrderReplyId;
      messages: string[];
    };

export interface BrokerageService {
  listAccounts(): Promise<BrokerAccountId[]>;
  getPositions(accountId: BrokerAccountId): Promise<BrokerPosition[]>;
  getWorkingOrders(accountId: BrokerAccountId): Promise<BrokerOrder[]>;
  getOrdersOfTheDay(accountId: BrokerAccountId): Promise<BrokerOrder[]>;
  getExecutions(accountId: BrokerAccountId): Promise<Execution[]>;
  placeBracketOrder(order: BracketOrder): Promise<OrderSubmission>;
  confirmOrder(replyId: OrderReplyId): Promise<OrderSubmission>;
  modifyOrder(
    order: BrokerOrder,
    changes: OrderChanges,
  ): Promise<OrderSubmission>;
  cancelOrder(
    accountId: BrokerAccountId,
    orderId: BrokerOrderId,
  ): Promise<void>;
}
