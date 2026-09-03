import { BreadthDate } from '../value-objects/breadth-date';

export interface MarketBreadthAggregateData {
  id: string;
  date: BreadthDate;
  universeSize: number;
  newHighs: number;
  newLows: number;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MarketBreadthAggregate {
  private constructor(
    public readonly id: string,
    public readonly date: BreadthDate,
    public readonly universeSize: number,
    public readonly newHighs: number,
    public readonly newLows: number,
    public readonly missingSymbols: string[],
    public readonly partial: boolean,
    public readonly backfilled: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(
    data: Omit<MarketBreadthAggregateData, 'id' | 'createdAt' | 'updatedAt'>,
  ): MarketBreadthAggregate {
    const now = new Date();
    return new MarketBreadthAggregate(
      crypto.randomUUID(),
      data.date,
      data.universeSize,
      data.newHighs,
      data.newLows,
      data.missingSymbols,
      data.partial,
      data.backfilled,
      now,
      now,
    );
  }

  static fromData(data: MarketBreadthAggregateData): MarketBreadthAggregate {
    return new MarketBreadthAggregate(
      data.id,
      data.date,
      data.universeSize,
      data.newHighs,
      data.newLows,
      data.missingSymbols,
      data.partial,
      data.backfilled,
      data.createdAt,
      data.updatedAt,
    );
  }

  get ratio(): number | null {
    const total = this.newHighs + this.newLows;
    return total === 0 ? null : this.newHighs / total;
  }
}
