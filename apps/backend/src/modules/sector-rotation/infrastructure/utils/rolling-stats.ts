export interface RollingStats {
  mean: number;
  variance: number;
  count: number;
}

export class RollingStatsCalculator {
  static addValue(
    stats: RollingStats,
    value: number,
  ): RollingStats {
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

  static removeValue(
    stats: RollingStats,
    value: number,
  ): RollingStats {
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


