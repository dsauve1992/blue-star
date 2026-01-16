import { WatchlistId } from '../value-objects/watchlist-id';
import { WatchlistName } from '../value-objects/watchlist-name';
import { WatchlistTicker } from '../value-objects/watchlist-ticker';
import { StateError } from '../domain-errors';
import { UserId } from '../../../position/domain/value-objects/user-id';

export interface CreateWatchlistArgs {
  userId: UserId;
  name: WatchlistName;
}

export class Watchlist {
  private constructor(
    public readonly id: WatchlistId,
    public readonly userId: UserId,
    public readonly name: WatchlistName,
    private _tickers: WatchlistTicker[],
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: CreateWatchlistArgs): Watchlist {
    const id = WatchlistId.new();
    const now = new Date();
    return new Watchlist(id, args.userId, args.name, [], now, now);
  }

  static fromData(data: {
    id: WatchlistId;
    userId: UserId;
    name: WatchlistName;
    tickers: WatchlistTicker[];
    createdAt: Date;
    updatedAt: Date;
  }): Watchlist {
    return new Watchlist(
      data.id,
      data.userId,
      data.name,
      [...data.tickers],
      data.createdAt,
      data.updatedAt,
    );
  }

  addTicker(ticker: WatchlistTicker): void {
    if (this.hasTicker(ticker)) {
      throw new StateError(
        `Ticker ${ticker.value} already exists in watchlist`,
      );
    }
    this._tickers.push(ticker);
    this._updatedAt = new Date();
  }

  removeTicker(ticker: WatchlistTicker): void {
    const index = this._tickers.findIndex((t) => t.value === ticker.value);
    if (index === -1) {
      throw new StateError(`Ticker ${ticker.value} not found in watchlist`);
    }
    this._tickers.splice(index, 1);
    this._updatedAt = new Date();
  }

  hasTicker(ticker: WatchlistTicker): boolean {
    return this._tickers.some((t) => t.value === ticker.value);
  }

  get tickers(): ReadonlyArray<WatchlistTicker> {
    return this._tickers;
  }

  get tickerCount(): number {
    return this._tickers.length;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
