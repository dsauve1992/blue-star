import { IsoTimestamp } from './iso-timestamp';
import { Ticker } from './ticker';
import { Quantity } from './quantity';
import { Price } from './price';
import { StopPrice } from './stop-price';
import { Action } from '../entities/position';

interface BaseEvent {
  ts: IsoTimestamp;
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
