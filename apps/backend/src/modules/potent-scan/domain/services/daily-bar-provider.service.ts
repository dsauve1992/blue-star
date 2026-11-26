import { Symbol } from '../../../../shared/value-objects/symbol';
import { SessionDate } from '../value-objects/session-date';

export interface DailyBar {
  date: SessionDate;
  high: number;
  low: number;
  close: number;
}

export interface DailyBarProvider {
  dailyBarsSince(ticker: Symbol, since: SessionDate): Promise<DailyBar[]>;
}
