import { PaperTradeId } from '../value-objects/paper-trade-id';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Shares } from '../value-objects/shares';

export enum PaperTradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum PaperTradeExitReason {
  STOP = 'STOP',
  TARGET = 'TARGET',
}

export interface OpenPaperTradeArgs {
  ticker: WatchlistTicker;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  shares: Shares;
  marketDate: string;
  openedAt: Date;
}

export interface PaperTradeSnapshot {
  id: PaperTradeId;
  ticker: WatchlistTicker;
  status: PaperTradeStatus;
  shares: Shares;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  riskPerShare: number;
  exitPrice?: number;
  exitReason?: PaperTradeExitReason;
  realizedR?: number;
  pnl?: number;
  marketDate: string;
  openedAt: Date;
  closedAt?: Date;
}

export class PaperTrade {
  private constructor(
    public readonly id: PaperTradeId,
    public readonly ticker: WatchlistTicker,
    public readonly entryPrice: number,
    public readonly stopPrice: number,
    public readonly targetPrice: number,
    public readonly shares: Shares,
    public readonly marketDate: string,
    public readonly openedAt: Date,
    private _status: PaperTradeStatus,
    private _exitPrice?: number,
    private _exitReason?: PaperTradeExitReason,
    private _closedAt?: Date,
  ) {}

  static open(args: OpenPaperTradeArgs): PaperTrade {
    if (args.stopPrice >= args.entryPrice) {
      throw new Error(
        `Stop price (${args.stopPrice}) must be below entry price (${args.entryPrice})`,
      );
    }
    if (args.targetPrice <= args.entryPrice) {
      throw new Error(
        `Target price (${args.targetPrice}) must be above entry price (${args.entryPrice})`,
      );
    }

    return new PaperTrade(
      PaperTradeId.new(),
      args.ticker,
      args.entryPrice,
      args.stopPrice,
      args.targetPrice,
      args.shares,
      args.marketDate,
      args.openedAt,
      PaperTradeStatus.OPEN,
    );
  }

  static fromSnapshot(snapshot: PaperTradeSnapshot): PaperTrade {
    return new PaperTrade(
      snapshot.id,
      snapshot.ticker,
      snapshot.entryPrice,
      snapshot.stopPrice,
      snapshot.targetPrice,
      snapshot.shares,
      snapshot.marketDate,
      snapshot.openedAt,
      snapshot.status,
      snapshot.exitPrice,
      snapshot.exitReason,
      snapshot.closedAt,
    );
  }

  close(
    exitPrice: number,
    exitReason: PaperTradeExitReason,
    closedAt: Date,
  ): void {
    if (this._status === PaperTradeStatus.CLOSED) {
      throw new Error(`Paper trade ${this.id.value} is already closed`);
    }
    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      throw new Error(`Exit price must be > 0: ${exitPrice}`);
    }
    this._status = PaperTradeStatus.CLOSED;
    this._exitPrice = exitPrice;
    this._exitReason = exitReason;
    this._closedAt = closedAt;
  }

  get riskPerShare(): number {
    return this.entryPrice - this.stopPrice;
  }

  get status(): PaperTradeStatus {
    return this._status;
  }

  get isOpen(): boolean {
    return this._status === PaperTradeStatus.OPEN;
  }

  get exitPrice(): number | undefined {
    return this._exitPrice;
  }

  get exitReason(): PaperTradeExitReason | undefined {
    return this._exitReason;
  }

  get closedAt(): Date | undefined {
    return this._closedAt;
  }

  get pnl(): number | undefined {
    if (this._exitPrice === undefined) return undefined;
    return (this._exitPrice - this.entryPrice) * this.shares.value;
  }

  get realizedR(): number | undefined {
    if (this._exitPrice === undefined) return undefined;
    return (this._exitPrice - this.entryPrice) / this.riskPerShare;
  }
}
