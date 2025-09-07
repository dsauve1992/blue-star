import { IsoTimestamp } from './value-objects/isoTimestamp';
import { PortfolioId } from './value-objects/portfolioId';
import { Ticker } from './value-objects/ticker';
import { Quantity } from './value-objects/quantity';
import { Price } from './value-objects/price';
import { StopPrice } from './value-objects/stopPrice';
import { Action } from './position';

interface BaseEvent {
  ts: IsoTimestamp;
  portfolioId: PortfolioId;
  instrument: Ticker;
  note?: string;
}

export interface BuyEvent extends BaseEvent {
  action: Action.BUY;
  qty: Quantity;
  price: Price;
}

export interface SellEvent extends BaseEvent {
  action: Action.SELL;
  qty: Quantity;
  price: Price;
}

export interface StopLossEvent extends BaseEvent {
  action: Action.STOP_LOSS;
  stop: StopPrice;
}

export type PositionEvent = BuyEvent | SellEvent | StopLossEvent;
