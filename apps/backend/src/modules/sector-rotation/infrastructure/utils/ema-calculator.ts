export class EMACalculator {
  static calculate(
    values: Map<number, number>,
    sortedDates: number[],
    period: number,
  ): Map<number, number> {
    const emaMap = new Map<number, number>();
    let ema: number | null = null;
    const multiplier = 2 / (period + 1);

    for (const date of sortedDates) {
      const value = values.get(date);
      if (value === undefined) {
        continue;
      }

      if (ema === null) {
        ema = value;
      } else {
        ema = (value - ema) * multiplier + ema;
      }

      emaMap.set(date, ema);
    }

    return emaMap;
  }
}

