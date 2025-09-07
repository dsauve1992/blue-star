import { Ticker } from './value-objects/ticker';
import { Quantity } from './value-objects/quantity';
import { Price } from './value-objects/price';
import { StopPrice } from './value-objects/stopPrice';

export type PortfolioId = string;
export type PositionId = number;
export type IsoTimestamp = string;

// =====================================================
// Method Argument Types
// =====================================================

export interface OpenPositionArgs {
  positionId: PositionId;
  portfolioId: PortfolioId;
  instrument: Ticker;
  ts: IsoTimestamp;
  qty: Quantity;
  price: Price;
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

// =====================================================
// Domain Events (inside a Position episode)
// =====================================================

export enum Action {
  BUY = 'BUY',
  SELL = 'SELL',
  STOP_LOSS = 'STOP_LOSS', // modifies unified stop level
}

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

// =====================================================
// Domain Errors
// =====================================================

export class DomainError extends Error {}
export class ChronologyError extends DomainError {}
export class StateError extends DomainError {}
export class InvariantError extends DomainError {}

// =====================================================
// Aggregate Root: Position
// =====================================================

export class Position {
  private constructor(
    public readonly positionId: PositionId,
    public readonly portfolioId: PortfolioId,
    public readonly instrument: Ticker,
    private _events: PositionEvent[],
    private _currentQty: number, // derived as we apply events
    private _closed: boolean, // true iff qty reached 0 at some point
  ) {}

  // ------------ Factories ------------

  /** Start a new position with the first BUY from flat. */
  static open(args: OpenPositionArgs): Position {
    const e: BuyEvent = {
      action: Action.BUY,
      ts: args.ts,
      portfolioId: args.portfolioId,
      instrument: args.instrument,
      qty: args.qty,
      price: args.price,
      note: args.note,
    };

    return new Position(
      args.positionId,
      args.portfolioId,
      args.instrument,
      [e],
      e.qty.value,
      false,
    );
  }

  static fromEvents(positionId: PositionId, events: PositionEvent[]): Position {
    if (events.length === 0) throw new InvariantError('Empty event stream');
    // Ensure first event is BUY and all (portfolio,instrument) match
    const first = events[0];
    if (first.action !== Action.BUY) {
      throw new InvariantError('Position must start with a BUY event');
    }
    const portfolioId = first.portfolioId;
    const instrument = first.instrument;

    // Apply events with integrity checks
    let qty = 0;
    let closed = false;
    let prevTs = '';
    for (const e of events) {
      // identity checks
      if (
        e.portfolioId !== portfolioId ||
        e.instrument.value !== instrument.value
      ) {
        throw new InvariantError('Event identity mismatch within position');
      }
      // chronology (non-decreasing)
      if (prevTs && new Date(e.ts).getTime() < new Date(prevTs).getTime()) {
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
      portfolioId,
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
      portfolioId: this.portfolioId,
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
      portfolioId: this.portfolioId,
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
      portfolioId: this.portfolioId,
      instrument: this.instrument,
      stop: args.stop,
      note: args.note,
    };
    this._events.push(e);
  }

  // ------------ Derived state (read-only) ------------

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

  // ------------ Internal guards ------------

  private ensureActive(): void {
    if (this._closed) throw new StateError('Position is closed');
  }

  private ensureChronology(ts: IsoTimestamp): void {
    const last = this._events[this._events.length - 1]?.ts;
    if (last && new Date(ts).getTime() < new Date(last).getTime()) {
      throw new ChronologyError(`Timestamp ${ts} precedes last event ${last}`);
    }
  }
}
