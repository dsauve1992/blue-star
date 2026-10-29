import { getMarketDateKey } from '../../../../shared/utils/market-clock';

export class ScanDate {
  private constructor(public readonly value: Date) {}

  static of(date: Date): ScanDate {
    return new ScanDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  static today(now: Date = new Date()): ScanDate {
    const [year, month, day] = getMarketDateKey(now).split('-').map(Number);
    return ScanDate.of(new Date(year, month - 1, day));
  }

  toISOString(): string {
    return this.value.toISOString().split('T')[0];
  }
}
