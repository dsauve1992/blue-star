import type {
  OrderSide,
  OrderType,
} from '../domain/services/brokerage.service';
import type {
  JournalStats,
  TradingCampaign,
} from '../domain/services/trading-journal';

export interface ListBrokerAccountsApiResponseDto {
  accounts: string[];
}

export interface BrokerPositionApiDto {
  accountId: string;
  ticker: string;
  instrumentId: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  currency: string;
}

export interface GetBrokerPositionsApiResponseDto {
  positions: BrokerPositionApiDto[];
}

export interface WorkingOrderApiDto {
  accountId: string;
  orderId: string;
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

export interface GetWorkingOrdersApiResponseDto {
  orders: WorkingOrderApiDto[];
}

export interface ExecutionApiDto {
  accountId: string;
  executionId: string;
  orderId: string | null;
  ticker: string;
  instrumentId: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number | null;
  executedAt: string;
}

export interface GetExecutionsApiResponseDto {
  executions: ExecutionApiDto[];
}

export type OrderSubmissionApiResponseDto =
  | { status: 'SUBMITTED'; orderIds: string[] }
  | { status: 'CONFIRMATION_REQUIRED'; replyId: string; messages: string[] };

export interface PlaceBracketOrderApiRequestDto {
  ticker: string;
  side: string;
  quantity: number;
  entryType: string;
  entryPrice?: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  timeInForce: string;
}

export interface ModifyOrderApiRequestDto {
  price?: number;
  quantity?: number;
}

export type TradingCampaignApiDto = Omit<
  TradingCampaign,
  'openedAt' | 'closedAt'
> & {
  openedAt: string | null;
  closedAt: string | null;
};

export interface GetTradingJournalApiResponseDto {
  campaigns: TradingCampaignApiDto[];
  stats: JournalStats;
}
