import { MarketBreadthAggregate } from '../entities/market-breadth-aggregate';
import { BreadthDate } from '../value-objects/breadth-date';

export interface MarketBreadthRepository {
  saveMembership(date: BreadthDate, symbols: string[]): Promise<void>;
  getMembership(date: BreadthDate): Promise<string[]>;

  saveAggregate(aggregate: MarketBreadthAggregate): Promise<void>;
  getRecentAggregates(limit: number): Promise<MarketBreadthAggregate[]>;
}
