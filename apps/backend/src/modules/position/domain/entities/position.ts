import { Ticker } from '../value-objects/ticker';
import { Quantity } from '../value-objects/quantity';
import { Price } from '../value-objects/price';
import { StopPrice } from '../value-objects/stop-price';
import { PositionId } from '../value-objects/position-id';
import { UserId } from '../value-objects/user-id';
import { IsoTimestamp } from '../value-objects/iso-timestamp';
import { ChronologyError, InvariantError, StateError } from '../domain-errors';
import {
  BuyEvent,
  PositionEvent,
  SellEvent,
  StopLossEvent,
} from '../value-objects/position-event';

export interface OpenPositionArgs {
  userId: UserId;
  instrument: Ticker;
  ts: IsoTimestamp;
  qty: Quantity;
  price: Price;
  stop: StopPrice;
  note?: string;
}

export interface BuyArgs {
  ts: IsoTimestamp;
  qty: Quantity;
  price: Price;
  note?: string;
}

export interface SellArgs {
  ts: IsoTimestamp;
  qty: Quantity;
  price: Price;
  note?: string;
}

export interface SetStopArgs {
  ts: IsoTimestamp;
  stop: StopPrice;
  note?: string;
}

export enum Action {
  BUY = 'BUY',
  SELL = 'SELL',
  STOP_LOSS = 'STOP_LOSS',
}

export class Position {
  private constructor(
    public readonly positionId: PositionId,
    public readonly userId: UserId,
    public readonly instrument: Ticker,
    private _events: PositionEvent[],
    private _currentQty: number,
    private _closed: boolean,
  ) {}

  /** Start a new position with the first BUY from flat and initial stop loss. */
  static open(args: OpenPositionArgs): Position {
    const positionId = PositionId.new();

    const buyEvent: BuyEvent = {
      action: Action.BUY,
      ts: args.ts,
      instrument: args.instrument,
      qty: args.qty,
      price: args.price,
      note: args.note,
    };

    const stopLossEvent: StopLossEvent = {
      action: Action.STOP_LOSS,
      ts: args.ts,
      instrument: args.instrument,
      stop: args.stop,
      note: args.note,
    };

    return new Position(
      positionId,
      args.userId,
      args.instrument,
      [buyEvent, stopLossEvent],
      buyEvent.qty.value,
      false,
    );
  }

  static fromEvents(
    positionId: PositionId,
    userId: UserId,
    events: PositionEvent[],
  ): Position {
    if (events.length === 0) throw new InvariantError('Empty event stream');

    const first = events[0];
    if (first.action !== Action.BUY) {
      throw new InvariantError('Position must start with a BUY event');
    }
    const instrument = first.instrument;

    Position.ensureHasStopLoss(events);

    let qty = 0;
    let closed = false;
    let prevTs: IsoTimestamp | undefined;
    for (const e of events) {
      if (e.instrument.value !== instrument.value) {
        throw new InvariantError('Event instrument mismatch within position');
      }

      if (prevTs && e.ts.toDate().getTime() < prevTs.toDate().getTime()) {
        throw new ChronologyError(
          'Events must be chronological (non-decreasing)',
        );
      }
      prevTs = e.ts;

      if (e.action === Action.BUY) {
        if (closed) throw new StateError('Cannot BUY after position is closed');
        qty += e.qty.value;
      } else if (e.action === Action.SELL) {
        if (e.qty.value > qty)
          throw new StateError('SELL exceeds current quantity');
        qty -= e.qty.value;
        if (qty === 0) closed = true;
      } else if (e.action === Action.STOP_LOSS) {
        if (closed) throw new StateError('Cannot modify stop after close');
      }
    }

    return new Position(
      positionId,
      userId,
      instrument,
      [...events],
      qty,
      closed,
    );
  }

  /** Append a BUY inside this episode. */
  buy(args: BuyArgs): void {
    this.ensureActive();
    this.ensureChronology(args.ts);
    const e: BuyEvent = {
      action: Action.BUY,
      ts: args.ts,
      instrument: this.instrument,
      qty: args.qty,
      price: args.price,
      note: args.note,
    };
    this._events.push(e);
    this._currentQty += e.qty.value;
  }

  /** Append a SELL (partial or full). Full sell will close the position. */
  sell(args: SellArgs): void {
    this.ensureActive();
    this.ensureChronology(args.ts);
    if (args.qty.value > this._currentQty) {
      throw new StateError(
        `SELL ${args.qty.value} > current qty ${this._currentQty}`,
      );
    }
    const e: SellEvent = {
      action: Action.SELL,
      ts: args.ts,
      instrument: this.instrument,
      qty: args.qty,
      price: args.price,
      note: args.note,
    };
    this._events.push(e);
    this._currentQty -= e.qty.value;
    if (this._currentQty === 0) this._closed = true;
  }

  /** Modify (set/raise) the unified stop. */
  setStop(args: SetStopArgs): void {
    this.ensureActive();
    this.ensureChronology(args.ts);
    const e: StopLossEvent = {
      action: Action.STOP_LOSS,
      ts: args.ts,
      instrument: this.instrument,
      stop: args.stop,
      note: args.note,
    };
    this._events.push(e);
  }

  get id(): PositionId {
    return this.positionId;
  }
  get events(): ReadonlyArray<PositionEvent> {
    return this._events;
  }
  get currentQty(): number {
    return this._currentQty;
  }
  get isActive(): boolean {
    return this._currentQty > 0;
  }
  get isClosed(): boolean {
    return this._closed;
  }

  /** Latest unified stop value in this episode (if any). */
  get latestStop(): number | undefined {
    for (let i = this._events.length - 1; i >= 0; i--) {
      const e = this._events[i];
      if (e.action === Action.STOP_LOSS) return e.stop.value;
    }
    return undefined;
  }

  get initialBuyEvent(): BuyEvent {
    if (this._events.length === 0) {
      throw new InvariantError('Position has no events');
    }
    const firstEvent = this._events[0];
    if (firstEvent.action !== Action.BUY) {
      throw new InvariantError('First event must be a BUY event');
    }

    return firstEvent;
  }

  private ensureActive(): void {
    if (this._closed) throw new StateError('Position is closed');
  }

  private ensureChronology(ts: IsoTimestamp): void {
    const last = this._events[this._events.length - 1]?.ts;
    if (last && ts.toDate().getTime() < last.toDate().getTime()) {
      throw new ChronologyError(
        `Timestamp ${ts.value} precedes last event ${last.value}`,
      );
    }
  }

  private static ensureHasStopLoss(events: PositionEvent[]): void {
    const hasStopLoss = events.some(e => e.action === Action.STOP_LOSS);
    if (!hasStopLoss) {
      throw new InvariantError('Position must have at least one stop loss event');
    }
  }
}
