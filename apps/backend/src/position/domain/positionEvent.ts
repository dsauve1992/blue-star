import { IsoTimestamp } from './value-objects/isoTimestamp';
import { PortfolioId } from './value-objects/portfolioId';
import { Ticker } from './value-objects/ticker';
import { Quantity } from './value-objects/quantity';
import { Price } from './value-objects/price';
import { StopPrice } from './value-objects/stopPrice';
import { Action } from './temp';

interface BaseEvent {
  ts: IsoTimestamp; // ISO-8601
  portfolioId: PortfolioId;
  instrument: Ticker; // use Ticker value object
  note?: string; // optional human context
}

export interface BuyEvent extends BaseEvent {
  action: Action.BUY;
  qty: Quantity; // use Quantity value object
  price: Price; // use Price value object
}

export interface SellEvent extends BaseEvent {
  action: Action.SELL;
  qty: Quantity; // use Quantity value object
  price: Price; // use Price value object
}

export interface StopLossEvent extends BaseEvent {
  action: Action.STOP_LOSS;
  stop: StopPrice; // use StopPrice value object
}

export type PositionEvent = BuyEvent | SellEvent | StopLossEvent;
