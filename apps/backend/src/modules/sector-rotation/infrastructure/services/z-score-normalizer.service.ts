import { Injectable } from '@nestjs/common';
import { RollingStats, RollingStatsCalculator } from '../utils/rolling-stats';

@Injectable()
export class ZScoreNormalizer {
  private readonly CENTER_VALUE = 100;
  private readonly SCALE_FACTOR = 10;

  normalizeWithRollingWindow(
    rawValues: Map<number, number>,
    sortedDates: number[],
    windowWeeks: number,
  ): Map<number, number> {
    const normalizedMap = new Map<number, number>();
    const windowQueue: Array<{ date: number; value: number }> = [];
    let stats: RollingStats = { mean: 0, variance: 0, count: 0 };

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const rawValue = rawValues.get(currentDate);

      if (rawValue === undefined) {
        continue;
      }

      const windowStartIndex = Math.max(0, i - windowWeeks + 1);
      const windowStartDate = sortedDates[windowStartIndex];

      while (
        windowQueue.length > 0 &&
        windowQueue[0].date < windowStartDate
      ) {
        const removed = windowQueue.shift()!;
        stats = RollingStatsCalculator.removeValue(stats, removed.value);
      }

      windowQueue.push({ date: currentDate, value: rawValue });
      stats = RollingStatsCalculator.addValue(stats, rawValue);

      if (stats.count > 0 && stats.variance > 0) {
        const stdDev = Math.sqrt(stats.variance);
        const zScore = (rawValue - stats.mean) / stdDev;
        const normalizedValue = this.CENTER_VALUE + zScore * this.SCALE_FACTOR;
        normalizedMap.set(currentDate, normalizedValue);
      }
    }

    return normalizedMap;
  }
}

