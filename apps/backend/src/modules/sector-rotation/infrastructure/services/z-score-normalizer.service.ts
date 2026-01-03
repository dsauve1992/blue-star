import { Injectable } from '@nestjs/common';

interface RollingWindowStats {
  mean: number;
  variance: number;
  count: number;
}

@Injectable()
export class ZScoreNormalizer {
  normalizeWithRollingWindow(
    rawValues: Map<number, number>,
    sortedDates: number[],
    windowWeeks: number,
  ): Map<number, number> {
    const normalizedMap = new Map<number, number>();
    const windowQueue: Array<{ date: number; value: number }> = [];
    let stats: RollingWindowStats = { mean: 0, variance: 0, count: 0 };

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
        stats = this.removeValue(stats, removed.value);
      }

      windowQueue.push({ date: currentDate, value: rawValue });
      stats = this.addValue(stats, rawValue);

      if (stats.count > 0 && stats.variance > 0) {
        const stdDev = Math.sqrt(stats.variance);
        const zScore = (rawValue - stats.mean) / stdDev;
        normalizedMap.set(currentDate, zScore);
      }
    }

    return normalizedMap;
  }

  private addValue(
    stats: RollingWindowStats,
    value: number,
  ): RollingWindowStats {
    const newCount = stats.count + 1;
    const delta = value - stats.mean;
    const newMean = stats.mean + delta / newCount;
    const delta2 = value - newMean;
    const newVariance =
      (stats.count * stats.variance + delta * delta2) / newCount;

    return {
      mean: newMean,
      variance: newVariance,
      count: newCount,
    };
  }

  private removeValue(
    stats: RollingWindowStats,
    value: number,
  ): RollingWindowStats {
    if (stats.count <= 1) {
      return { mean: 0, variance: 0, count: 0 };
    }

    const newCount = stats.count - 1;
    const delta = value - stats.mean;
    const newMean = stats.mean - delta / newCount;
    const delta2 = value - newMean;
    const newVariance =
      (stats.count * stats.variance - delta * delta2) / newCount;

    return {
      mean: newMean,
      variance: Math.max(0, newVariance),
      count: newCount,
    };
  }
}

